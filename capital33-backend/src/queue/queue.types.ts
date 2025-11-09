import { JobStatus } from './queue.constants';
import { JobDocument } from './schemas/job.schema';

export interface JobPayload {
  [key: string]: any;
}

export interface JobResult {
  [key: string]: any;
}

export interface IJobHandler {
  handle(job: JobDocument): Promise<JobResult>;
}
