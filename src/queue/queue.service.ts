import { createHash } from 'crypto';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotFoundError } from '../common/errors/domain-errors';
import { ErrorCodes } from '../common/errors/error-codes';

import { JobRepository } from './job.repository';
import type { FindJobsOptions } from './job.repository';
import { JobStatus, JobPriority } from './queue.constants';
import { JobDocument } from './schemas/job.schema';

export interface EnqueueJobDto {
  type: string;
  payload: Record<string, unknown>;
  maxAttempts?: number;
  priority?: number;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('QueueService initialized');
    await this.jobRepository.createIndexes();
  }

  async enqueue(dto: EnqueueJobDto): Promise<JobDocument> {
    const idempotencyKey = createHash('sha256')
      .update(dto.type + JSON.stringify(dto.payload))
      .digest('hex');

    const job = await this.jobRepository.create({
      type: dto.type,
      status: JobStatus.QUEUED,
      payload: dto.payload,
      attempts: 0,
      maxAttempts:
        dto.maxAttempts ||
        this.configService.get<number>('queue.maxAttempts', 5),
      priority: dto.priority ?? JobPriority.NORMAL,
      availableAt: new Date(),
      visibilityTimeoutMs: this.configService.get<number>(
        'queue.visibilityMs',
        30000,
      ),
      idempotencyKey,
    });

    return job;
  }

  async getJobById(id: string): Promise<JobDocument> {
    const job = await this.jobRepository.findById(id);
    if (!job) {
      throw new NotFoundError(
        ErrorCodes.QUEUE_JOB_NOT_FOUND,
        `Job with ID ${id} not found`,
      );
    }
    return job;
  }

  async getJobs(
    status?: JobStatus,
    type?: string,
    limit?: number,
  ): Promise<JobDocument[]> {
    const options: FindJobsOptions = {};
    if (status !== undefined) options.status = status;
    if (type !== undefined) options.type = type;
    if (limit !== undefined) options.limit = limit;
    return this.jobRepository.findJobs(options);
  }
}
