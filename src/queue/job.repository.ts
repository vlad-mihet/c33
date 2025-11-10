import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';

import type { JobStatus } from './queue.constants';
import { Job } from './schemas/job.schema';
import type { JobDocument } from './schemas/job.schema';

export interface FindJobsOptions {
  status?: JobStatus;
  type?: string;
  limit?: number;
}

@Injectable()
export class JobRepository {
  private readonly logger = new Logger(JobRepository.name);

  constructor(
    @InjectModel(Job.name)
    private jobModel: Model<JobDocument>,
  ) {}

  async create(data: Partial<Job>): Promise<JobDocument> {
    const job = new this.jobModel(data);
    return job.save();
  }

  async findById(id: string): Promise<JobDocument | null> {
    return this.jobModel
      .findById(id)
      .lean()
      .exec() as Promise<JobDocument | null>;
  }

  async findJobs(options: FindJobsOptions = {}): Promise<JobDocument[]> {
    const { status, type, limit = 100 } = options;
    const filter: FilterQuery<Job> = {};

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }

    return this.jobModel
      .find(filter)
      .sort({ createdAt: 1 }) // FIFO
      .limit(limit)
      .lean()
      .exec() as Promise<JobDocument[]>;
  }

  /**
   * Atomically claim a queued job by updating its status to processing.
   * This ensures only one worker processes the job.
   */
  async claimNextJob(): Promise<JobDocument | null> {
    return this.jobModel
      .findOneAndUpdate(
        { status: 'queued' as JobStatus },
        {
          $set: {
            status: 'processing' as JobStatus,
            startedAt: new Date(),
          },
          $inc: { attempts: 1 },
        },
        {
          new: true,
          sort: { createdAt: 1 },
        },
      )
      .exec();
  }

  async markSucceeded(
    id: string,
    result: Record<string, unknown>,
  ): Promise<JobDocument | null> {
    return this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'succeeded' as JobStatus,
            result,
            finishedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  async markFailed(
    id: string,
    error: { message: string; stack?: string },
  ): Promise<JobDocument | null> {
    return this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'failed' as JobStatus,
            error: {
              code: 'JOB_EXECUTION_FAILED',
              title: 'Job Execution Failed',
              detail: error.message,
              details: error.stack
                ? [{ message: error.stack }]
                : [{ message: error.message }],
            },
            finishedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Requeue a job (set status back to queued, useful for retries)
   */
  async requeue(id: string): Promise<JobDocument | null> {
    return this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'queued' as JobStatus,
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Unstick jobs that have been processing for too long.
   * Returns them to queued status if they haven't exceeded max attempts.
   */
  async unstickStaleJobs(
    thresholdMs: number,
  ): Promise<{ unstuck: number; failed: number }> {
    const threshold = new Date(Date.now() - thresholdMs);

    const staleJobs = await this.jobModel
      .find({
        status: 'processing' as JobStatus,
        startedAt: { $lt: threshold },
      })
      .exec();

    let unstuck = 0;
    let failed = 0;

    for (const job of staleJobs) {
      if (job.attempts >= job.maxAttempts) {
        // Mark as failed if max attempts reached
        await this.markFailed(job._id.toString(), {
          message: 'Max attempts exceeded after job became stuck',
        });
        failed++;
      } else {
        // Requeue for retry
        await this.requeue(job._id.toString());
        unstuck++;
      }
    }

    if (unstuck > 0 || failed > 0) {
      this.logger.log(
        `Unstuck ${String(unstuck)} jobs, failed ${String(failed)} jobs`,
      );
    }

    return { unstuck, failed };
  }

  async createIndexes(): Promise<void> {
    try {
      await this.jobModel.createIndexes();
      this.logger.log('Job indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create job indexes', error);
    }
  }
}
