# Environment Variables

All configuration variables. See `.env.sample` for a template.

## Required Variables

| Variable | Type | Description |
|----------|------|-------------|
| `MONGODB_URI` | string | MongoDB connection URI (e.g., `mongodb://localhost:27017/capital33`) |

## Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment: `development`, `production`, or `test` |
| `APP_PORT` | `3000` | HTTP server port |

## Security

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin(s) |

## Queue System

| Variable | Default | Description |
|----------|---------|-------------|
| `QUEUE_CONCURRENCY` | `4` | Number of jobs processed in parallel |
| `QUEUE_IDLE_MS` | `750` | Polling interval when queue is idle (milliseconds) |
| `QUEUE_VISIBILITY_MS` | `30000` | Job visibility timeout - job returns to queue if not completed (30s) |
| `QUEUE_HEARTBEAT_MS` | `10000` | Heartbeat interval to extend visibility (10s) |
| `QUEUE_BACKOFF_BASE_MS` | `1000` | Base backoff delay for retries (1s) |
| `QUEUE_BACKOFF_FACTOR` | `2` | Exponential backoff multiplier |
| `QUEUE_BACKOFF_MAX_MS` | `60000` | Maximum backoff delay (60s) |
| `QUEUE_MAX_ATTEMPTS` | `5` | Maximum retry attempts before job moves to DLQ |
| `QUEUE_DLQ_RETENTION_DAYS` | `30` | Days to retain dead-letter queue jobs |

## Import

| Variable | Default | Description |
|----------|---------|-------------|
| `IMPORT_DATA_DIR` | `./data` | Directory for XLSX import files |

## Notes

- **Visibility**: Jobs return to queue after timeout if not completed. Heartbeat extends timeout for long jobs.
- **Backoff**: Exponential: `min(BASE * FACTOR^attempt, MAX)`
- **Concurrency**: Higher = more throughput + more memory
- **DLQ**: Failed jobs move here after max attempts
