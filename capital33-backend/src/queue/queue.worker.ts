import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { JobRepository } from './job.repository';
import { JobDocument } from './schemas/job.schema';
import { IJobHandler } from './queue.types';
import { Cron } from '@nestjs/schedule';

/**
 * Queue worker service that polls for queued jobs and processes them.
 * Uses @nestjs/schedule for periodic polling.
 * Handlers are registered dynamically via ModuleRef.
 */
@Injectable()
export class QueueWorkerService implements OnModuleInit {
  private readonly logger = new Logger(QueueWorkerService.name);
  private readonly pollMs: number;
  private readonly stuckThresholdMs: number;
  private handlers: Map<string, IJobHandler> = new Map();
  private isProcessing = false;

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.pollMs = this.configService.get<number>('queue.pollMs', 5000);
    this.stuckThresholdMs = this.configService.get<number>(
      'queue.stuckThresholdMs',
      300000,
    );
  }

  async onModuleInit() {
    this.logger.log(`Queue worker initialized. Polling every ${this.pollMs}ms`);
    // Start polling with dynamic interval from config
    setInterval(() => void this.processJobs(), this.pollMs);
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler(type: string, handler: IJobHandler): void {
    this.handlers.set(type, handler);
    this.logger.log(`Registered handler for job type: ${type}`);
  }

  /**
   * Poll for queued jobs and process them
   */
  async processJobs(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;

    try {
      // Unstick stale jobs first
      await this.jobRepository.unstickStaleJobs(this.stuckThresholdMs);

      // Claim and process next job
      const job = await this.jobRepository.claimNextJob();
      if (job) {
        await this.processJob(job);
      }
    } catch (error) {
      this.logger.error('Error in job processing loop', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: JobDocument): Promise<void> {
    this.logger.log(`Processing job ${job._id} of type ${job.type}`);

    const handler = this.handlers.get(job.type);
    if (!handler) {
      const error = `No handler registered for job type: ${job.type}`;
      this.logger.error(error);
      await this.jobRepository.markFailed(job._id.toString(), error);
      return;
    }

    try {
      const result = await handler.handle(job);
      await this.jobRepository.markSucceeded(job._id.toString(), result);
      this.logger.log(`Job ${job._id} succeeded`);
    } catch (error) {
      this.logger.error(`Job ${job._id} failed`, error);

      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        this.logger.log(
          `Job ${job._id} will be retried (attempt ${job.attempts}/${job.maxAttempts})`,
        );
        await this.jobRepository.requeue(job._id.toString());
      } else {
        await this.jobRepository.markFailed(
          job._id.toString(),
          error.message || String(error),
        );
      }
    }
  }
}
