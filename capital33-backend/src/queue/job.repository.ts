import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { JobStatus } from './queue.constants';

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
    return this.jobModel.findById(id).exec();
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
      .exec();
  }

  /**
   * Atomically claim a queued job by updating its status to processing.
   * This ensures only one worker processes the job.
   */
  async claimNextJob(): Promise<JobDocument | null> {
    return this.jobModel
      .findOneAndUpdate(
        { status: JobStatus.QUEUED },
        {
          $set: {
            status: JobStatus.PROCESSING,
            startedAt: new Date(),
          },
          $inc: { attempts: 1 },
        },
        {
          new: true,
          sort: { createdAt: 1 }, // FIFO
        },
      )
      .exec();
  }

  /**
   * Mark job as succeeded
   */
  async markSucceeded(id: string, result: any): Promise<JobDocument | null> {
    return this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: JobStatus.SUCCEEDED,
            result,
            finishedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Mark job as failed
   */
  async markFailed(id: string, error: string): Promise<JobDocument | null> {
    return this.jobModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: JobStatus.FAILED,
            error,
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
            status: JobStatus.QUEUED,
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

    // Find stale processing jobs
    const staleJobs = await this.jobModel
      .find({
        status: JobStatus.PROCESSING,
        startedAt: { $lt: threshold },
      })
      .exec();

    let unstuck = 0;
    let failed = 0;

    for (const job of staleJobs) {
      if (job.attempts >= job.maxAttempts) {
        // Mark as failed if max attempts reached
        await this.markFailed(
          job._id.toString(),
          'Max attempts exceeded after job became stuck',
        );
        failed++;
      } else {
        // Requeue for retry
        await this.requeue(job._id.toString());
        unstuck++;
      }
    }

    if (unstuck > 0 || failed > 0) {
      this.logger.log(`Unstuck ${unstuck} jobs, failed ${failed} jobs`);
    }

    return { unstuck, failed };
  }

  /**
   * Ensure indexes are created
   */
  async createIndexes(): Promise<void> {
    try {
      await this.jobModel.createIndexes();
      this.logger.log('Job indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create job indexes', error);
    }
  }
}
