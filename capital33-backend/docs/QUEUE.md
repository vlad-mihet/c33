# Queue System Documentation

## Overview

The Capital 33 Backend implements a lightweight, production-grade background job processing system backed by MongoDB. The system is designed for reliability, scalability, and crash recovery without requiring external queue infrastructure like Redis or RabbitMQ.

## Architecture

```
┌─────────────────┐
│   Producer      │
│  (Any Service)  │
└────────┬────────┘
         │ enqueue()
         ▼
┌─────────────────┐
│  QueueService   │
│  • Validates    │
│  • Creates Job  │
└────────┬────────┘
         │ save to MongoDB
         ▼
┌─────────────────┐
│   Job Collection│
│   (MongoDB)     │
│  status:queued  │
└────────┬────────┘
         │ poll every 5s
         ▼
┌─────────────────┐
│ QueueWorker     │
│ • Claims job    │
│ • Processes     │
│ • Updates status│
└────────┬────────┘
         │ delegate
         ▼
┌─────────────────┐
│  Job Handler    │
│  (type-specific)│
│  e.g., Import   │
└─────────────────┘
```

## Core Components

### 1. QueueService

**Location**: `src/queue/queue.service.ts`

**Responsibilities**:
- Accept job enqueue requests
- Validate job data
- Create job documents in MongoDB
- Query job status and history

**Key Methods**:

```typescript
// Enqueue a new job
async enqueue(dto: EnqueueJobDto): Promise<JobDocument>

// Get job by ID
async getJobById(id: string): Promise<JobDocument>

// List jobs with filters
async getJobs(status?: JobStatus, type?: string, limit?: number): Promise<JobDocument[]>
```

**Usage Example**:
```typescript
const job = await queueService.enqueue({
  type: JobType.IMPORT_XLSX_CUSTOMERS,
  payload: { filePath: './data/customers.xlsx' },
  maxAttempts: 3,
});
```

---

### 2. QueueWorkerService

**Location**: `src/queue/queue.worker.ts`

**Responsibilities**:
- Poll MongoDB for queued jobs
- Claim jobs atomically (prevent race conditions)
- Execute job handlers
- Implement retry logic
- Recover from crashes (unstick stale jobs)

**Key Features**:

#### Polling Mechanism
```typescript
@Interval(5000) // Configurable via QUEUE_POLL_MS
async processJobs(): Promise<void> {
  // Prevent concurrent processing
  if (this.isProcessing) return;

  this.isProcessing = true;
  try {
    // Unstick stale jobs
    await this.jobRepository.unstickStaleJobs(this.stuckThresholdMs);

    // Claim next job
    const job = await this.jobRepository.claimNextJob();

    if (job) {
      await this.processJob(job);
    }
  } finally {
    this.isProcessing = false;
  }
}
```

#### Handler Registry
```typescript
registerHandler(type: string, handler: IJobHandler): void {
  this.handlers.set(type, handler);
}
```

#### Retry Logic
```typescript
if (job.attempts < job.maxAttempts) {
  await this.jobRepository.requeue(job._id.toString());
} else {
  await this.jobRepository.markFailed(job._id.toString(), error.message);
}
```

---

### 3. JobRepository

**Location**: `src/queue/job.repository.ts`

**Responsibilities**:
- CRUD operations for jobs
- Atomic job claiming
- Index management

**Key Methods**:

#### Atomic Job Claiming
```typescript
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
```

**Why Atomic?**
- Prevents race conditions when multiple workers run
- Uses MongoDB's atomic `findOneAndUpdate`
- Only one worker gets the job, even with concurrent requests

#### Crash Recovery
```typescript
async unstickStaleJobs(thresholdMs: number): Promise<{unstuck: number; failed: number}> {
  const threshold = new Date(Date.now() - thresholdMs);

  const staleJobs = await this.jobModel.find({
    status: JobStatus.PROCESSING,
    startedAt: { $lt: threshold },
  });

  for (const job of staleJobs) {
    if (job.attempts >= job.maxAttempts) {
      await this.markFailed(job._id, 'Max attempts exceeded after job became stuck');
    } else {
      await this.requeue(job._id);
    }
  }
}
```

---

### 4. Job Handlers

**Location**: `src/queue/handlers/`

**Interface**:
```typescript
export interface IJobHandler {
  handle(job: JobDocument): Promise<JobResult>;
}
```

**Example Handler** (`ImportXlsxHandler`):
```typescript
@Injectable()
export class ImportXlsxHandler implements IJobHandler {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async handle(job: JobDocument): Promise<ImportSummary> {
    const { filePath } = job.payload;

    // Parse XLSX
    const rows = parseXlsxFile(filePath);

    // Validate and import
    for (const row of rows) {
      // Validation logic
      // Import logic
    }

    return summary;
  }
}
```

---

## Job Lifecycle

```
┌──────────┐
│  QUEUED  │ ← Initial state when job is created
└────┬─────┘
     │ Worker claims job (atomic operation)
     ▼
┌────────────┐
│ PROCESSING │ ← Worker is actively processing
└─────┬──────┘
      │
      ├─────► Success?
      │           │
      │           ▼
      │      ┌────────────┐
      │      │ SUCCEEDED  │ ← Job completed successfully
      │      └────────────┘
      │
      └─────► Failure?
                  │
                  ▼
             Attempts < maxAttempts?
                  │
                  ├─── Yes ──► Back to QUEUED (retry)
                  │
                  └─── No ───► ┌──────────┐
                               │  FAILED  │
                               └──────────┘
```

### State Transitions

1. **Created** → `queued`
2. **Claimed** → `queued` → `processing` (atomic)
3. **Success** → `processing` → `succeeded`
4. **Retry** → `processing` → `queued`
5. **Final Failure** → `processing` → `failed`
6. **Unstuck** → `processing` (stale) → `queued` or `failed`

---

## Configuration

### Environment Variables

```env
# Queue worker polling interval (milliseconds)
QUEUE_POLL_MS=5000

# Maximum retry attempts per job
QUEUE_MAX_ATTEMPTS=3

# Threshold for detecting stuck jobs (milliseconds)
QUEUE_STUCK_THRESHOLD_MS=300000  # 5 minutes
```

### Access Configuration
```typescript
constructor(private configService: ConfigService) {
  this.pollMs = configService.get<number>('queue.pollMs', 5000);
  this.maxAttempts = configService.get<number>('queue.maxAttempts', 3);
  this.stuckThresholdMs = configService.get<number>('queue.stuckThresholdMs', 300000);
}
```

---

## Database Schema

### Job Collection

```typescript
{
  type: string,              // Job type identifier
  status: string,            // queued | processing | succeeded | failed
  payload: object,           // Job-specific input data
  result?: object,           // Job output (on success)
  attempts: number,          // Current retry count
  maxAttempts: number,       // Maximum retry count
  error?: string,            // Error message (on failure)
  createdAt: Date,           // Job creation time
  updatedAt: Date,           // Last update time
  startedAt?: Date,          // When processing started
  finishedAt?: Date,         // When job completed/failed
}
```

### Indexes

1. **Composite Index**: `{status: 1, createdAt: 1}`
   - **Purpose**: Efficient FIFO job fetching
   - **Query**: Find oldest queued job
   - **Performance**: O(log n) instead of O(n)

2. **Type Index**: `{type: 1}`
   - **Purpose**: Filter jobs by type
   - **Query**: List all import jobs
   - **Performance**: Fast filtered queries

3. **CreatedAt Index**: `{createdAt: -1}`
   - **Purpose**: Recent job queries
   - **Query**: Get latest 100 jobs
   - **Performance**: Sorted retrieval

---

## Adding New Job Types

### Step 1: Define Job Type Constant

```typescript
// src/queue/queue.constants.ts
export enum JobType {
  IMPORT_XLSX_CUSTOMERS = 'import.xlsx.customers',
  SEND_EMAIL = 'send.email',  // New job type
}
```

### Step 2: Create Handler

```typescript
// src/queue/handlers/send-email.handler.ts
import { Injectable } from '@nestjs/common';
import { IJobHandler, JobResult } from '../queue.types';
import { JobDocument } from '../schemas/job.schema';

@Injectable()
export class SendEmailHandler implements IJobHandler {
  async handle(job: JobDocument): Promise<JobResult> {
    const { to, subject, body } = job.payload;

    // Email sending logic

    return { sent: true, messageId: '...' };
  }
}
```

### Step 3: Register Handler

```typescript
// src/queue/queue.module.ts
@Module({
  providers: [
    SendEmailHandler,  // Add to providers
  ],
})
export class QueueModule implements OnModuleInit {
  onModuleInit() {
    const emailHandler = this.moduleRef.get(SendEmailHandler);
    this.worker.registerHandler(JobType.SEND_EMAIL, emailHandler);
  }
}
```

### Step 4: Enqueue Jobs

```typescript
await queueService.enqueue({
  type: JobType.SEND_EMAIL,
  payload: {
    to: 'user@example.com',
    subject: 'Welcome',
    body: 'Hello!',
  },
  maxAttempts: 5,
});
```

---

## Monitoring & Observability

### Job Metrics

Query MongoDB for job statistics:

```typescript
// Total jobs by status
db.jobs.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Average processing time
db.jobs.aggregate([
  { $match: { status: 'succeeded' } },
  {
    $project: {
      processingTime: {
        $subtract: ['$finishedAt', '$startedAt']
      }
    }
  },
  { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
])

// Failed jobs in last hour
db.jobs.find({
  status: 'failed',
  updatedAt: { $gt: new Date(Date.now() - 3600000) }
})
```

### Logs

Worker logs include:
- Job claiming events
- Processing start/completion
- Retry attempts
- Error details
- Unstick operations

Example log output:
```
[QueueWorkerService] Processing job 507f1f77... of type import.xlsx.customers
[ImportXlsxHandler] Importing customers from: ./data/customers.xlsx
[ImportXlsxHandler] Parsed 10 rows from XLSX
[ImportXlsxHandler] Import complete: 8 inserted, 2 updated, 0 failed
[QueueWorkerService] Job 507f1f77... succeeded
```

---

## Performance Considerations

### Polling Interval

**Trade-offs**:
- **Short interval (1-2s)**: Lower latency, higher CPU usage
- **Long interval (10-30s)**: Higher latency, lower CPU usage
- **Recommended (5s)**: Balanced for most use cases

### Batch Processing

Current implementation processes **one job at a time**.

For higher throughput, consider:
```typescript
async processJobs() {
  const jobs = await this.jobRepository.claimMultipleJobs(10);
  await Promise.all(jobs.map(job => this.processJob(job)));
}
```

### Concurrency

Current: **Single worker** per application instance

For horizontal scaling:
- Run multiple application instances
- Each instance runs its own worker
- Atomic claiming prevents job duplication
- MongoDB handles concurrency

---

## Error Handling

### Transient Errors (Retryable)

Examples:
- Network timeouts
- Temporary database unavailability
- External API rate limits

**Behavior**: Job requeued for retry (up to maxAttempts)

### Permanent Errors (Non-retryable)

Examples:
- Invalid job payload
- File not found
- Business logic validation errors

**Best Practice**: Mark as failed immediately
```typescript
if (isPermanentError(error)) {
  throw error;  // Will be marked as failed
}
```

### Poison Pills

Jobs that always fail can block the queue.

**Prevention**:
- Set reasonable `maxAttempts` (e.g., 3)
- Log failed jobs for manual investigation
- Implement dead letter queue pattern

```typescript
if (job.attempts >= job.maxAttempts) {
  await this.moveToDeadLetterQueue(job);
}
```

---

## Crash Recovery

### Scenario: Worker Crashes Mid-Job

1. Job stuck in `processing` state
2. Worker never updates status
3. Job never completes

### Solution: Unstick Mechanism

```typescript
async unstickStaleJobs(thresholdMs: number) {
  // Find jobs processing for > threshold
  const staleJobs = await this.findStaleJobs(thresholdMs);

  for (const job of staleJobs) {
    if (job.attempts < job.maxAttempts) {
      // Requeue for retry
      await this.requeue(job._id);
    } else {
      // Mark as failed
      await this.markFailed(job._id, 'Stuck after crash');
    }
  }
}
```

**Runs on every worker poll** (before claiming next job)

---

## Idempotency

### Overview

Jobs are automatically deduplicated to prevent duplicate execution when the same job is enqueued multiple times (e.g., network retries, user double-clicks).

### Implementation

**Idempotency Key Generation**:
```typescript
// In QueueService.enqueue()
const idempotencyKey = createHash('sha256')
  .update(dto.type + JSON.stringify(dto.payload))
  .digest('hex');
```

**Database Schema**:
```typescript
@Prop({ unique: true, sparse: true })
idempotencyKey?: string;

// Index for fast lookup and uniqueness enforcement
JobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
```

### Behavior

**Duplicate Submission**:
```typescript
// First submission - succeeds
await queueService.enqueue({
  type: 'import.xlsx.customers',
  payload: { filePath: './data/customers.xlsx' }
});
// Returns: { _id: '...', status: 'queued', ... }

// Duplicate submission - MongoDB duplicate key error
await queueService.enqueue({
  type: 'import.xlsx.customers',
  payload: { filePath: './data/customers.xlsx' }
});
// Throws: MongoError E11000 duplicate key (caught by global filter → 409 Conflict)
```

**Different Payloads**:
```typescript
// Different payload = different idempotency key
await queueService.enqueue({
  type: 'import.xlsx.customers',
  payload: { filePath: './data/different-file.xlsx' }
});
// Returns: New job created (different hash)
```

### Benefits

- **Prevents duplicate processing**: Same file won't be imported twice
- **Network retry safe**: Frontend can safely retry failed requests
- **User error protection**: Double-clicks don't create duplicate jobs
- **Deterministic**: Same input always produces same hash

### Limitations

- **Payload order sensitive**: `{a:1, b:2}` !== `{b:2, a:1}` (different JSON serialization)
- **No time-based expiry**: Once a job exists, identical payload is blocked forever
- **Handler idempotency still needed**: Jobs may be retried after failures

---

## Testing

### Unit Tests

Test job processing logic in isolation:

```typescript
describe('ImportXlsxHandler', () => {
  it('should import valid customers', async () => {
    const job = {
      _id: '123',
      payload: { filePath: './test.xlsx' },
    };

    const result = await handler.handle(job);

    expect(result.inserted).toBe(5);
    expect(result.failed).toBe(0);
  });
});
```

### E2E Tests

Test full queue flow:

```typescript
it('should process enqueued job', async () => {
  // Enqueue job
  const response = await request(app).post('/queue/enqueue').send({
    type: 'test.job',
    payload: { data: 'test' },
  });

  const jobId = response.body._id;

  // Wait for processing
  await delay(6000);

  // Check status
  const status = await request(app).get(`/queue/${jobId}`);
  expect(status.body.status).toBe('succeeded');
});
```

---

## Migration to External Queue

For production at scale, consider migrating to:

### BullMQ (Redis-based)

**Benefits**:
- Better performance (in-memory)
- Advanced features (rate limiting, priority)
- Battle-tested at scale

**Migration Path**:
1. Keep `IJobHandler` interface
2. Replace `QueueService` and `QueueWorkerService`
3. Handlers remain unchanged
4. Update configuration

**Effort**: ~2-3 days

### AWS SQS

**Benefits**:
- Fully managed
- Infinite scalability
- Pay-per-use

**Trade-offs**:
- Cloud vendor lock-in
- Higher latency than Redis

---

## Best Practices

1. **Idempotent Handlers**
   - **Queue-level deduplication**: Jobs are automatically deduplicated using SHA-256 hash of type + payload
   - **Handler-level idempotency**: Still required for retry scenarios (job may fail and retry)
   - Ensure repeated execution is safe
   - Example: Use upsert operations, check if customer already imported

2. **Timeout Limits**
   - Long-running jobs may be unstuck
   - Keep jobs short (<5 minutes)
   - Break long tasks into multiple jobs

3. **Payload Size**
   - Keep payload small (<1MB)
   - Store large data elsewhere (S3, filesystem)
   - Reference by ID/path in payload

4. **Error Messages**
   - Include actionable details
   - Add context (row number, filename)
   - Example: "Row 5: Invalid email format"

5. **Monitoring**
   - Track job success/failure rates
   - Alert on high failure rates
   - Monitor queue depth

6. **Resource Cleanup**
   - Delete old succeeded jobs (>30 days)
   - Archive failed jobs for analysis
   - Limit queue size to prevent MongoDB bloat
