import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { JobRepository } from './job.repository';
import { JobStatus } from './queue.constants';
import { JobDocument } from './schemas/job.schema';

export interface EnqueueJobDto {
  type: string;
  payload: Record<string, any>;
  maxAttempts?: number;
}

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly jobRepository: JobRepository) {}

  async onModuleInit() {
    this.logger.log('QueueService initialized');
    await this.jobRepository.createIndexes();
  }

  async enqueue(dto: EnqueueJobDto): Promise<JobDocument> {
    // Generate idempotency key from job type and payload
    const idempotencyKey = createHash('sha256')
      .update(dto.type + JSON.stringify(dto.payload))
      .digest('hex');

    const job = await this.jobRepository.create({
      type: dto.type,
      status: JobStatus.QUEUED,
      payload: dto.payload,
      attempts: 0,
      maxAttempts: dto.maxAttempts || 3,
      idempotencyKey,
    });

    return job;
  }

  async getJobById(id: string): Promise<JobDocument> {
    const job = await this.jobRepository.findById(id);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async getJobs(
    status?: JobStatus,
    type?: string,
    limit?: number,
  ): Promise<JobDocument[]> {
    return this.jobRepository.findJobs({ status, type, limit });
  }
}
