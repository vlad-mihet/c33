# Capital 33 Backend API

Production-grade NestJS backend API for Capital 33 fintech platform. Provides customer management, background job processing, and XLSX import capabilities with comprehensive validation and error handling.

## Features

- **Customer Management**: Full CRUD operations with pagination, filtering, and duplicate prevention
- **Background Job Queue**: Mongo-backed queue system with retry logic, crash recovery, and idempotency
- **XLSX Import**: Bulk customer import with row-level validation, deduplication, and automatic cleanup
- **Joi Validation**: Consistent request and data validation across all endpoints
- **OpenAPI Documentation**: Interactive Swagger UI at `/docs`
- **Security Hardened**: Helmet protection, CORS configuration, ObjectId validation, NoSQL injection prevention
- **Production-Ready**: Global error handling, logging, graceful shutdown, and proper separation of concerns

## Architecture

### Module Structure

```
src/
├── config/           # Environment configuration with Joi validation
├── common/           # Shared utilities (pipes, filters, interceptors)
├── customer/         # Customer CRUD module
│   ├── schemas/      # Mongoose schemas
│   ├── dtos/         # Joi validation schemas
│   ├── repository.ts # Data access layer
│   ├── service.ts    # Business logic
│   └── controller.ts # HTTP endpoints
├── queue/            # Background job queue module
│   ├── schemas/      # Job schema
│   ├── handlers/     # Job type handlers
│   ├── repository.ts # Job data access
│   ├── service.ts    # Queue operations
│   ├── worker.ts     # Job processor
│   └── controller.ts # Queue API
└── import/           # XLSX import module
    ├── utils/        # XLSX parsing utilities
    ├── service.ts    # Import orchestration
    └── controller.ts # Import endpoints
```

### Key Design Decisions

1. **Repository Pattern**: Separates data access from business logic for testability
2. **Joi Validation**: Unified validation approach for API requests and import data
3. **Mongo-Backed Queue**: No external dependencies, uses atomic operations for job claiming
4. **Global Filters & Interceptors**: Centralized error handling and request logging
5. **Module Isolation**: Clear boundaries between features with explicit exports

## Prerequisites

- Node.js 20 LTS
- MongoDB 6+ (local or Atlas)
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the environment template and update with your MongoDB URI:

```bash
cp .env.sample .env
```

Edit `.env`:

```env
# Application
APP_PORT=3000
NODE_ENV=development

# Security
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/capital33

# Queue
QUEUE_POLL_MS=5000
QUEUE_MAX_ATTEMPTS=3

# Import
IMPORT_DATA_DIR=./data
```

### 3. Generate Sample Data

```bash
npm run seed
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The server starts on `http://localhost:3000` with:
- API endpoints at `http://localhost:3000`
- Swagger documentation at `http://localhost:3000/docs`

### Production Mode

```bash
npm run build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## API Documentation

### Swagger UI

Access interactive API documentation at `http://localhost:3000/docs` when the server is running.

### Customer Endpoints

#### Create Customer

```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@c33.io","balance":1200}'
```

Response (201):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ada Lovelace",
  "email": "ada@c33.io",
  "balance": 1200,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### Get All Customers (Paginated)

```bash
curl http://localhost:3000/customers?page=1&limit=10
```

With filters:
```bash
curl "http://localhost:3000/customers?name=Ada&email=c33.io&page=1&limit=10"
```

#### Get Customer by ID

```bash
curl http://localhost:3000/customers/507f1f77bcf86cd799439011
```

#### Update Customer

```bash
curl -X PATCH http://localhost:3000/customers/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"balance":1500}'
```

#### Delete Customer

```bash
curl -X DELETE http://localhost:3000/customers/507f1f77bcf86cd799439011
```

### Queue Endpoints

#### Enqueue Job

```bash
curl -X POST http://localhost:3000/queue/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "type":"import.xlsx.customers",
    "payload":{"filePath":"./data/customers.sample.xlsx"}
  }'
```

Response (201):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "import.xlsx.customers",
  "status": "queued",
  "payload": {"filePath": "./data/customers.sample.xlsx"},
  "attempts": 0,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Get Job Status

```bash
curl http://localhost:3000/queue/507f1f77bcf86cd799439012
```

#### List Jobs

```bash
curl http://localhost:3000/queue?status=queued&type=import.xlsx.customers
```

### Import Endpoints

#### Import by Filename

```bash
curl -X POST http://localhost:3000/imports/xlsx \
  -H "Content-Type: application/json" \
  -d '{"filename":"customers.sample.xlsx"}'
```

Response (202):
```json
{
  "message": "Import job enqueued successfully",
  "jobId": "507f1f77bcf86cd799439013",
  "status": "queued"
}
```

#### Upload and Import

```bash
curl -F "file=@./data/customers.sample.xlsx" \
  http://localhost:3000/imports/xlsx/upload
```

#### Check Import Result

After enqueueing, check the job status to see the import summary:

```bash
curl http://localhost:3000/queue/<jobId>
```

Result includes:
```json
{
  "result": {
    "totalRows": 10,
    "valid": 9,
    "inserted": 7,
    "updated": 2,
    "skipped": 0,
    "failed": 1,
    "errors": [
      {"row": 5, "reason": "Email must be a valid email address"}
    ]
  }
}
```

## Testing

### Unit Tests

```bash
npm run test
```

Tests cover:
- `CustomerService` - CRUD operations, validation, error handling
- `JoiValidationPipe` - Schema validation, error formatting

### E2E Tests

```bash
npm run test:e2e
```

E2E tests use `mongodb-memory-server` for isolated testing:
- Customer CRUD flows
- Queue enqueue and status operations
- Import job processing

### Test Coverage

```bash
npm run test:cov
```

## Validation

All endpoints use Joi validation schemas:

### Customer Validation

- **name**: string, min 2 characters, required
- **email**: valid email format, required, unique
- **balance**: number, defaults to 0

### Import Row Validation

XLSX rows are validated with the same schema as API requests, ensuring consistency across entry points.

## Error Handling

### HTTP Status Codes

- `200 OK` - Successful GET, PATCH, DELETE
- `201 Created` - Successful POST (customer, job)
- `202 Accepted` - Import job enqueued
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate email
- `500 Internal Server Error` - Unexpected error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {"field": "email", "message": "Email must be a valid email address"}
  ]
}
```

## Security

The application implements multiple layers of security hardening:

### HTTP Security
- **Helmet**: XSS protection, clickjacking prevention, MIME sniffing protection
- **CORS**: Configurable via `CORS_ORIGIN` environment variable (defaults to `http://localhost:3000`)
- **Graceful Shutdown**: SIGTERM handler ensures connections drain properly

### Input Validation
- **ObjectId Validation**: All MongoDB ObjectIds validated before database queries to prevent CastError exceptions
- **NoSQL Injection Prevention**: User inputs in regex filters are escaped using `escapeRegExp` to prevent ReDoS attacks
- **Path Traversal Protection**: File uploads validated with `path.basename()` and `..` rejection
- **Joi Validation**: Comprehensive schema validation on all request payloads

### Database Security
- **Connection Hardening**: Configured with `retryWrites`, `writeConcern: majority`, connection timeouts
- **Duplicate Key Handling**: E11000 errors mapped to 409 Conflict responses
- **Index Creation**: Indexes created on startup to ensure optimal performance

### Error Handling
- **Global Exception Filter**: Prevents internal error details from leaking to clients
- **Structured Logging**: Request/response logging with method, URL, status, and timing
- **Sanitized Responses**: Error responses include only safe, user-facing information

## Queue System

### How It Works

1. **Producer**: Enqueue jobs via POST `/queue/enqueue`
2. **Worker**: Polls MongoDB every 5 seconds (configurable via `QUEUE_POLL_MS`)
3. **Atomic Claiming**: Uses `findOneAndUpdate` to prevent duplicate processing
4. **Idempotency**: Jobs deduplicated using SHA-256 hash of type + payload
5. **Retry Logic**: Retries failed jobs up to `maxAttempts` (default: 3)
6. **Crash Recovery**: Unsticks jobs stuck in "processing" state after threshold

### Job Lifecycle

```
queued → processing → succeeded
                   ↓
                failed (after max attempts)
```

### Monitoring

- Check job status: `GET /queue/:id`
- List all jobs: `GET /queue`
- Filter by status: `GET /queue?status=failed`

## XLSX Import Format

### Expected Columns

```
| name              | email                   | balance |
|-------------------|-------------------------|---------|
| Ada Lovelace      | ada@c33.io              | 1200    |
| Alan Turing       | alan@c33.io             | 1500    |
```

### Import Behavior

- **Sheet Name**: Looks for "Customers" sheet, falls back to first sheet
- **Validation**: Each row validated with Joi schema
- **Deduplication**: Upserts by email (inserts new, updates existing)
- **Error Reporting**: Returns row-level errors with reasons

## Scripts

```bash
npm run dev          # Start development server with watch mode
npm run build        # Build for production
npm run start        # Start built application
npm run start:prod   # Start production server
npm run lint         # Lint code with ESLint
npm run format       # Format code with Prettier
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:cov     # Generate test coverage report
npm run seed         # Seed database with sample customers
```

## Project Structure

```
capital33-backend/
├── src/
│   ├── config/                      # Environment configuration
│   ├── common/                      # Shared utilities
│   │   ├── pipes/                   # Joi validation pipe
│   │   ├── filters/                 # Mongo exception filter
│   │   ├── interceptors/            # Logging interceptor
│   │   └── utils/                   # Result types
│   ├── customer/                    # Customer module
│   ├── queue/                       # Queue module
│   ├── import/                      # Import module
│   ├── app.module.ts                # Root module
│   └── main.ts                      # Application bootstrap
├── test/
│   ├── unit/                        # Unit tests
│   └── e2e/                         # E2E tests
├── data/                            # Data files
│   └── customers.sample.xlsx        # Sample import file
├── scripts/
│   ├── seed.ts                      # Database seed script
│   └── generate-sample-xlsx.ts      # Sample file generator
├── .env.sample                      # Environment template
└── package.json
```

## Technical Stack

- **Runtime**: Node.js 20 LTS, TypeScript
- **Framework**: NestJS 11
- **Database**: MongoDB 6+ with Mongoose ODM
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **File Processing**: xlsx
- **Upload Handling**: Multer
- **Testing**: Jest, Supertest, mongodb-memory-server
- **Code Quality**: ESLint, Prettier

## License

UNLICENSED
