import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotFoundError } from '../common/errors/domain-errors';
import { ErrorCodes } from '../common/errors/error-codes';

import { DeadLetterRepository } from './dead-letter.repository';
import type { FindDlqJobsOptions } from './dead-letter.repository';
import { QueueService } from './queue.service';
import { DeadLetterJobDocument } from './schemas/dead-letter-job.schema';

@Injectable()
export class DeadLetterService implements OnModuleInit {
  private readonly logger = new Logger(DeadLetterService.name);
  private retentionDays: number;

  constructor(
    private readonly dlqRepository: DeadLetterRepository,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.retentionDays = this.configService.get<number>(
      'queue.dlqRetentionDays',
      30,
    );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(
      `DeadLetterService initialized (retention: ${String(this.retentionDays)} days)`,
    );
    await this.dlqRepository.createIndexes();
  }

  async getDlqJobById(id: string): Promise<DeadLetterJobDocument> {
    const job = await this.dlqRepository.findById(id);
    if (!job) {
      throw new NotFoundError(
        ErrorCodes.QUEUE_DLQ_NOT_FOUND,
        `DLQ job with ID ${id} not found`,
      );
    }
    return job;
  }

  async getDlqJobs(
    type?: string,
    limit?: number,
    offset?: number,
  ): Promise<{
    jobs: DeadLetterJobDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const options: FindDlqJobsOptions = {};
    if (type !== undefined) options.type = type;
    if (limit !== undefined) options.limit = limit;
    if (offset !== undefined) options.offset = offset;
    const jobs = await this.dlqRepository.findJobs(options);
    const total = await this.dlqRepository.count(type);

    return {
      jobs,
      total,
      limit: limit || 100,
      offset: offset || 0,
    };
  }

  async retryDlqJob(
    id: string,
  ): Promise<{ dlqJob: DeadLetterJobDocument; newJobId: string }> {
    const dlqJob = await this.getDlqJobById(id);

    const newJob = await this.queueService.enqueue({
      type: dlqJob.type,
      payload: dlqJob.payload,
      priority: dlqJob.priority,
      maxAttempts: dlqJob.maxAttempts,
    });

    await this.dlqRepository.incrementRetryCount(id);

    this.logger.log(
      `Retrying DLQ job ${id} as new job ${String(newJob._id)} (type: ${dlqJob.type})`,
    );

    return {
      dlqJob,
      newJobId: newJob._id.toString(),
    };
  }

  async deleteDlqJob(id: string): Promise<void> {
    const deleted = await this.dlqRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(
        ErrorCodes.QUEUE_DLQ_NOT_FOUND,
        `DLQ job with ID ${id} not found`,
      );
    }
  }

  /**
   * Cleanup old DLQ jobs (runs daily at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldJobs(): Promise<void> {
    this.logger.log(
      `Running DLQ cleanup (retention: ${String(this.retentionDays)} days)`,
    );
    const deletedCount = await this.dlqRepository.deleteOldJobs(
      this.retentionDays,
    );
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${String(deletedCount)} old DLQ jobs`);
    }
  }
}
