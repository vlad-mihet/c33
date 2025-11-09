import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { JobStatus } from '../queue.constants';

export type JobDocument = HydratedDocument<Job>;

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  type: string;

  @Prop({
    required: true,
    enum: Object.values(JobStatus),
    default: JobStatus.QUEUED,
  })
  status: JobStatus;

  @Prop({ type: Object, required: true })
  payload: Record<string, any>;

  @Prop({ type: Object })
  result?: Record<string, any>;

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ required: true, default: 3 })
  maxAttempts: number;

  @Prop()
  error?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Indexes for efficient queue processing
JobSchema.index({ status: 1, createdAt: 1 }); // For fetching queued jobs in FIFO order
JobSchema.index({ type: 1 }); // For filtering by job type
JobSchema.index({ createdAt: -1 }); // For recent jobs
JobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true }); // For deduplication
