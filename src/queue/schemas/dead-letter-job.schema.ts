import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { JobStatus } from '../queue.constants';

export type DeadLetterJobDocument = HydratedDocument<DeadLetterJob>;

/**
 * Dead Letter Queue - Stores permanently failed jobs for investigation and retry
 */
@Schema({ timestamps: true })
export class DeadLetterJob {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true, type: String, default: JobStatus.FAILED })
  status!: JobStatus;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: Object })
  result?: Record<string, unknown>;

  @Prop({ required: true })
  attempts!: number;

  @Prop({ required: true })
  maxAttempts!: number;

  @Prop({ required: true, default: 100 })
  priority!: number;

  @Prop({ type: Object })
  error?: {
    code?: string;
    title?: string;
    detail?: string;
    details?: unknown[];
  };

  @Prop({ required: true })
  originalJobId!: string; // Reference to original job ID

  @Prop()
  movedToDlqAt!: Date; // When job was moved to DLQ

  @Prop()
  lastAttemptAt?: Date; // When last attempt was made

  @Prop({ default: 0 })
  retryCount!: number; // Number of times job was retried from DLQ

  @Prop()
  retriedAt?: Date; // When job was last retried from DLQ

  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}

export const DeadLetterJobSchema = SchemaFactory.createForClass(DeadLetterJob);

// Indexes for efficient DLQ querying
DeadLetterJobSchema.index({ type: 1 }); // Filter by job type
DeadLetterJobSchema.index({ movedToDlqAt: -1 }); // Recent failed jobs
DeadLetterJobSchema.index({ originalJobId: 1 }); // Lookup by original job
DeadLetterJobSchema.index({ retryCount: 1 }); // Jobs by retry attempts
