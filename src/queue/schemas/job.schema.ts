import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

import type { JobStatus } from '../queue.constants';

export type JobDocument = HydratedDocument<Job>;

export interface JobErrorDetails {
  code?: string;
  title?: string;
  detail?: string;
  details?: Array<{
    field?: string;
    location?: string;
    message: string;
    hint?: string;
  }>;
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  type!: string;

  @Prop({
    required: true,
    type: String,
    default: 'queued',
  })
  status!: JobStatus;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Object })
  result?: Record<string, unknown>;

  @Prop({ required: true, default: 0 })
  attempts!: number;

  @Prop({ required: true, default: 5 })
  maxAttempts!: number;

  @Prop({ default: 100 })
  priority!: number;

  @Prop({ type: Date, default: () => new Date() })
  availableAt!: Date;

  @Prop({ type: Date })
  lockedAt?: Date;

  @Prop()
  lockOwner?: string;

  @Prop({ type: Date })
  lastHeartbeatAt?: Date;

  @Prop({ default: 30000 })
  visibilityTimeoutMs!: number;

  @Prop({ type: Object })
  error?: JobErrorDetails;

  @Prop()
  startedAt?: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  idempotencyKey?: string;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Indexes for efficient queue processing
JobSchema.index({ status: 1, availableAt: 1, priority: 1, createdAt: 1 }); // For atomic job claiming with priority
JobSchema.index({ lockOwner: 1, status: 1 }); // For heartbeat updates and stuck job detection
JobSchema.index({ type: 1 }); // For filtering by job type
JobSchema.index({ createdAt: -1 }); // For recent jobs
JobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true }); // For deduplication
