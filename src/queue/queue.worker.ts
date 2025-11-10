import { randomUUID } from 'crypto';
import * as os from 'os';

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { DeadLetterRepository } from './dead-letter.repository';
import { JobStatus } from './queue.constants';
import { Job, JobDocument } from './schemas/job.schema';

export type JobHandler = (job: JobDocument) => Promise<unknown>;

/**
 * Queue worker with concurrent loops, visibility timeout, and heartbeat.
 */
@Injectable()
export class QueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkerService.name);
  private stopping = false;
  private workerId = `${os.hostname()}-${String(process.pid)}-${randomUUID()}`;
  private loops: Promise<void>[] = [];
  private handlers: Map<string, JobHandler> = new Map();

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly configService: ConfigService,
    private readonly dlqRepository: DeadLetterRepository,
  ) {}

  onModuleInit(): void {
    const concurrency = this.configService.get<number>('queue.concurrency', 4);
    this.logger.log(
      `Starting ${String(concurrency)} queue worker(s) id=${this.workerId}`,
    );
    for (let i = 0; i < concurrency; i++) {
      this.loops.push(this.runLoop(i));
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    this.logger.log('Stopping workers...');
    await Promise.allSettled(this.loops);
    this.logger.log('Workers stopped');
  }

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
    this.logger.log(`Registered handler for job type: ${type}`);
  }

  private async runLoop(slot: number): Promise<void> {
    const idleMs = this.configService.get<number>('queue.idleMs', 750);

    while (!this.stopping) {
      try {
        // Opportunistically unstick stale processing jobs
        await this.requeueStuck();

        const job = await this.claimNext();
        if (!job) {
          await this.sleep(idleMs);
          continue;
        }

        await this.processJob(job);
      } catch (error) {
        this.logger.error(
          `Worker loop ${String(slot)} error: ${error instanceof Error ? error.message : String(error)}`,
          error,
        );
        await this.sleep(idleMs);
      }
    }
  }

  private async requeueStuck(): Promise<void> {
    const now = new Date();

    try {
      await this.jobModel
        .updateMany(
          {
            status: JobStatus.PROCESSING,
            lockedAt: { $exists: true },
            $expr: {
              $lt: [{ $add: ['$lockedAt', '$visibilityTimeoutMs'] }, now],
            },
          },
          {
            $set: { status: JobStatus.QUEUED },
            $unset: {
              lockOwner: '',
              lockedAt: '',
              lastHeartbeatAt: '',
            },
          },
        )
        .exec();
    } catch {
      // Silently fail - this is opportunistic cleanup
    }
  }

  private async claimNext(): Promise<JobDocument | null> {
    const now = new Date();

    try {
      const job = await this.jobModel
        .findOneAndUpdate(
          {
            status: JobStatus.QUEUED,
            availableAt: { $lte: now },
          },
          {
            $set: {
              status: JobStatus.PROCESSING,
              lockOwner: this.workerId,
              lockedAt: now,
              lastHeartbeatAt: now,
              startedAt: now,
            },
            $inc: { attempts: 1 },
          },
          {
            sort: { priority: 1, availableAt: 1, createdAt: 1 },
            returnDocument: 'after',
          },
        )
        .lean<JobDocument>()
        .exec();

      return job;
    } catch (error) {
      this.logger.error('Error claiming job', error);
      return null;
    }
  }

  private async processJob(job: JobDocument): Promise<void> {
    const handler = this.handlers.get(job.type);

    if (!handler) {
      this.logger.warn(
        `No handler for type=${job.type}. Failing job ${String(job._id)}`,
      );
      await this.fail(job, {
        code: 'QUEUE_INVALID_TYPE',
        title: 'Invalid job type',
        detail: `Unknown type ${job.type}`,
      });
      return;
    }

    const heartbeatMs = this.configService.get<number>(
      'queue.heartbeatMs',
      10000,
    );
    let hbTimer: NodeJS.Timeout | undefined;

    const beat = (): void => {
      void (async () => {
        try {
          await this.jobModel
            .updateOne(
              {
                _id: job._id,
                status: JobStatus.PROCESSING,
                lockOwner: this.workerId,
              },
              {
                $set: {
                  lastHeartbeatAt: new Date(),
                  lockedAt: new Date(),
                },
              },
            )
            .exec();
        } catch {
          // Ignore heartbeat errors
        }
      })();
      hbTimer = setTimeout(beat, heartbeatMs).unref();
    };

    hbTimer = setTimeout(beat, heartbeatMs).ref();

    try {
      this.logger.log(
        `Processing job ${String(job._id)} (type: ${job.type}, attempt ${String(job.attempts)}/${String(job.maxAttempts)})`,
      );
      const result = await handler(job);

      clearTimeout(hbTimer);
      await this.succeed(job, result);
      this.logger.log(`Job ${String(job._id)} succeeded`);
    } catch (error: unknown) {
      clearTimeout(hbTimer);
      await this.retryOrFail(job, error);
    }
  }

  private async succeed(job: JobDocument, result: unknown): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: job._id, lockOwner: this.workerId },
        {
          $set: {
            status: JobStatus.SUCCEEDED,
            result,
            finishedAt: new Date(),
          },
          $unset: {
            lockOwner: '',
            lockedAt: '',
            lastHeartbeatAt: '',
          },
        },
      )
      .exec();
  }

  private async retryOrFail(job: JobDocument, error: unknown): Promise<void> {
    const attempts = job.attempts;
    const maxAttempts = job.maxAttempts;

    const errorInfo = {
      code:
        error instanceof Error && 'code' in error
          ? String((error as { code: unknown }).code)
          : 'QUEUE_PROCESSING_FAILED',
      title:
        error instanceof Error && 'title' in error
          ? String((error as { title: unknown }).title)
          : 'Job processing failed',
      detail: error instanceof Error ? error.message : String(error),
    };

    if (attempts >= maxAttempts) {
      this.logger.error(
        `Job ${String(job._id)} failed after ${String(attempts)} attempts: ${errorInfo.detail}`,
      );
      await this.fail(job, errorInfo);
      return;
    }

    // Calculate exponential backoff
    const baseMs = this.configService.get<number>('queue.backoffBaseMs', 1000);
    const factor = this.configService.get<number>('queue.backoffFactor', 2);
    const maxMs = this.configService.get<number>('queue.backoffMaxMs', 60000);
    const backoff = Math.min(
      Math.floor(baseMs * Math.pow(factor, attempts - 1)),
      maxMs,
    );
    const nextAvailable = new Date(Date.now() + backoff);

    this.logger.warn(
      `Job ${String(job._id)} failed (attempt ${String(attempts)}/${String(maxAttempts)}), retrying in ${String(backoff)}ms: ${errorInfo.detail}`,
    );

    await this.jobModel
      .updateOne(
        { _id: job._id, lockOwner: this.workerId },
        {
          $set: {
            status: JobStatus.QUEUED,
            availableAt: nextAvailable,
            error: errorInfo,
          },
          $unset: {
            lockOwner: '',
            lockedAt: '',
            lastHeartbeatAt: '',
          },
        },
      )
      .exec();
  }

  private async fail(
    job: JobDocument,
    error: { code?: string; title?: string; detail: string },
  ): Promise<void> {
    await this.jobModel
      .updateOne(
        { _id: job._id, lockOwner: this.workerId },
        {
          $set: {
            status: JobStatus.FAILED,
            error,
            finishedAt: new Date(),
          },
          $unset: {
            lockOwner: '',
            lockedAt: '',
            lastHeartbeatAt: '',
          },
        },
      )
      .exec();

    try {
      const failedJob = await this.jobModel.findById(job._id).exec();
      if (failedJob) {
        await this.dlqRepository.moveJobToDlq(failedJob);
      }
    } catch (dlqError) {
      this.logger.error(
        `Failed to move job ${String(job._id)} to DLQ: ${dlqError instanceof Error ? dlqError.message : String(dlqError)}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
