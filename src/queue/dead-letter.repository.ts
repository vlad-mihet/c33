import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';

import {
  DeadLetterJob,
  DeadLetterJobDocument,
} from './schemas/dead-letter-job.schema';
import { JobDocument } from './schemas/job.schema';

export interface FindDlqJobsOptions {
  type?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class DeadLetterRepository {
  private readonly logger = new Logger(DeadLetterRepository.name);

  constructor(
    @InjectModel(DeadLetterJob.name)
    private dlqModel: Model<DeadLetterJobDocument>,
  ) {}

  async moveJobToDlq(job: JobDocument): Promise<DeadLetterJobDocument> {
    const dlqJob = new this.dlqModel({
      type: job.type,
      status: job.status,
      payload: job.payload,
      result: job.result,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      priority: job.priority,
      error: job.error,
      originalJobId: job._id.toString(),
      movedToDlqAt: new Date(),
      lastAttemptAt: job.finishedAt,
      retryCount: 0,
      idempotencyKey: job.idempotencyKey,
    });

    const saved = await dlqJob.save();
    this.logger.log(
      `Moved job ${String(job._id)} to DLQ (type: ${job.type}, attempts: ${String(job.attempts)})`,
    );
    return saved;
  }

  async findById(id: string): Promise<DeadLetterJobDocument | null> {
    return this.dlqModel.findById(id).exec();
  }

  async findByOriginalJobId(
    jobId: string,
  ): Promise<DeadLetterJobDocument | null> {
    return this.dlqModel.findOne({ originalJobId: jobId }).exec();
  }

  async findJobs(
    options: FindDlqJobsOptions = {},
  ): Promise<DeadLetterJobDocument[]> {
    const { type, limit = 100, offset = 0 } = options;
    const filter: FilterQuery<DeadLetterJob> = {};

    if (type) {
      filter.type = type;
    }

    return this.dlqModel
      .find(filter)
      .sort({ movedToDlqAt: -1 }) // Most recent first
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async count(type?: string): Promise<number> {
    const filter: FilterQuery<DeadLetterJob> = {};
    if (type) {
      filter.type = type;
    }
    return this.dlqModel.countDocuments(filter).exec();
  }

  async incrementRetryCount(id: string): Promise<DeadLetterJobDocument | null> {
    return this.dlqModel
      .findByIdAndUpdate(
        id,
        {
          $inc: { retryCount: 1 },
          $set: { retriedAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dlqModel.findByIdAndDelete(id).exec();
    if (result) {
      this.logger.log(`Deleted DLQ job ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Delete old DLQ jobs (retention policy)
   */
  async deleteOldJobs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.dlqModel
      .deleteMany({
        movedToDlqAt: { $lt: cutoffDate },
      })
      .exec();

    if (result.deletedCount && result.deletedCount > 0) {
      this.logger.log(
        `Deleted ${String(result.deletedCount)} old DLQ jobs (retention: ${String(retentionDays)} days)`,
      );
    }

    return result.deletedCount || 0;
  }

  async createIndexes(): Promise<void> {
    try {
      await this.dlqModel.createIndexes();
      this.logger.log('DLQ indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create DLQ indexes', error);
    }
  }
}
