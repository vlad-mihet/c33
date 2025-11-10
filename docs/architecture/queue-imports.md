# Queue & Import System

## Queue

MongoDB-backed job queue. No Redis/RabbitMQ needed.

### How It Works

Worker runs N concurrent loops (default 4). Each loop:
1. Claims a job atomically via `findOneAndUpdate` with `lockOwner` + `lockedAt`
2. Starts heartbeat timer - refreshes `lockedAt` every 10s to keep the lock
3. Runs the job handler
4. Marks succeeded/failed or requeues with backoff

Stuck jobs (where `lockedAt + visibilityTimeoutMs < now`) get automatically requeued.

### Job Fields

- `status`: queued | processing | succeeded | failed
- `priority`: lower = higher priority (default 100)
- `availableAt`: when job becomes available (used for backoff delay)
- `lockedAt`: when job was claimed
- `lockOwner`: worker ID that claimed it
- `visibilityTimeoutMs`: how long before stuck job requeues (default 30s)
- `attempts/maxAttempts`: retry tracking (default max 5)

### Retry Backoff

Failed jobs requeue with exponential delay: `min(BASE * FACTOR^attempt, MAX)`

Defaults: BASE=1000ms, FACTOR=2, MAX=60000ms

After max attempts, job moves to dead letter queue.

### Config

```env
QUEUE_CONCURRENCY=4           # parallel workers
QUEUE_VISIBILITY_MS=30000     # lock timeout
QUEUE_HEARTBEAT_MS=10000      # heartbeat interval
QUEUE_MAX_ATTEMPTS=5          # retries before DLQ
```

See [environment.md](../reference/environment.md) for all options.

---

## XLSX Imports

Import flow:
- POST `/api/v1/imports/xlsx` (filename) or `/api/v1/imports/xlsx/upload` (file)
- Lookup type in `config/import-manifest.json` (e.g., `Accounts-Payable.xlsx` → `ap`)
- Enqueue job with matched type
- Worker routes to handler (e.g., `ImportApHandler`)
- Parse XLSX, validate rows with Joi, bulk upsert
- Clean up uploaded files
- Return summary: `{totalRows, inserted, updated, failed, errors: [{row, reason}]}`

### Manifest

`config/import-manifest.json`:

```json
{
  "Accounts-Payable.xlsx": { "type": "ap", "sheetName": "AP Data" },
  "Budget-Forecast.xlsx": { "type": "budgetForecast", "sheetName": "Budget" }
}
```

### Handlers

All import handlers extend `BaseImportHandler<T>`:

```typescript
class ImportApHandler extends BaseImportHandler<ApDocument> {
  protected readonly importType = 'ap';
  protected readonly schema = apSchema;

  protected getUpsertFilter(row: any) {
    return { invoiceNumber: row.invoiceNumber };
  }
}
```

Base class handles parsing, validation, bulk writes (100/batch), cleanup, error collection.

### Deduplication

Each handler defines unique key via `getUpsertFilter()`:
- Customers: `{email}`
- AP: `{invoiceNumber}`
- Budget: `{year, category, department}`

Jobs also deduplicated at queue level via SHA-256 hash of type+payload. Resubmitting identical job → 409 Conflict.

### Security

- Path traversal check: `basename(filename) === filename && !includes('..')`
- File type: MIME + `.xlsx` extension check
- Size: 10MB max

---

## Monitoring

```bash
# Job status
curl http://localhost:3000/api/v1/queue/{jobId}

# Failed jobs
curl http://localhost:3000/api/v1/queue?status=failed

# Dead letter queue
curl http://localhost:3000/api/v1/queue/dead-letter
```
