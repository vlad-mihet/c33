# Architecture Documentation

## Overview

NestJS application for customer management, background jobs, and bulk imports. Uses repository pattern and separates concerns by module.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Layer                              │
│  (Controllers + Swagger Documentation)                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Global Middleware                           │
│  • ValidationPipe (class-validator + Joi)                   │
│  • MongoExceptionFilter (409 Conflict handling)             │
│  • LoggingInterceptor (request/response logging)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐           │
│  │  Customer   │  │  Queue   │  │   Import     │           │
│  │  Service    │  │ Service  │  │   Service    │           │
│  └──────┬──────┘  └────┬─────┘  └──────┬───────┘           │
│         │              │                │                    │
│  ┌──────▼──────┐  ┌───▼──────┐  ┌──────▼───────┐           │
│  │  Customer   │  │   Job    │  │ XLSX Parser  │           │
│  │ Repository  │  │Repository│  │   Utility    │           │
│  └──────┬──────┘  └────┬─────┘  └──────────────┘           │
└─────────┼───────────────┼─────────────────────────────────┘
          │               │
┌─────────▼───────────────▼─────────────────────────────────┐
│                    Data Layer                              │
│              MongoDB with Mongoose ODM                     │
│  Collections: customers, jobs                              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  Background Workers                         │
│  QueueWorkerService (polls every 5s, processes jobs)       │
│  • Atomic job claiming                                      │
│  • Retry logic with exponential backoff                    │
│  • Crash recovery (unsticks stale jobs)                    │
└────────────────────────────────────────────────────────────┘
```

## Module Architecture

### Core Modules

#### 1. **Customer Module** (`src/customer/`)

**Responsibility**: Manages customer CRUD operations with validation and deduplication.

**Components**:
- `CustomerController` - HTTP endpoints for customer management
- `CustomerService` - Business logic (validation, deduplication checks)
- `CustomerRepository` - Data access layer with Mongoose
- `customer.schema.ts` - MongoDB schema with indexes
- `dtos/*.joi.ts` - Joi validation schemas for requests

**Key Features**:
- Unique email enforcement via MongoDB index
- Pagination and filtering support
- Repository pattern for testability
- Conflict detection (409) for duplicate emails

**Dependencies**: MongooseModule, Common utilities

---

#### 2. **Queue Module** (`src/queue/`)

**Responsibility**: Lightweight background job processing system backed by MongoDB.

**Components**:
- `QueueController` - Job enqueue and status endpoints
- `QueueService` - Job creation and querying
- `QueueWorkerService` - Background worker with polling
- `JobRepository` - Atomic job operations
- `handlers/` - Job type-specific handlers (e.g., ImportXlsxHandler)

**Key Features**:
- **Atomic Job Claiming**: Uses `findOneAndUpdate` to prevent race conditions
- **Retry Logic**: Configurable max attempts (default: 3)
- **Crash Recovery**: Automatically unsticks jobs stuck in "processing" state
- **FIFO Processing**: Jobs processed in creation order
- **Handler Registry**: Extensible pattern for new job types

**Job Lifecycle**:
```
queued → [worker claims] → processing → [success/failure]
                                    ↓
                            succeeded or failed
                                    ↓
                       [retry if attempts < maxAttempts]
```

**Dependencies**: MongooseModule, ScheduleModule, CustomerModule (for ImportXlsxHandler)

---

#### 3. **Import Module** (`src/import/`)

**Responsibility**: XLSX file import with validation and deduplication.

**Components**:
- `ImportsController` - File upload and import trigger endpoints
- `ImportsService` - Orchestrates import job creation
- `utils/xlsx.util.ts` - XLSX parsing and row normalization

**Key Features**:
- Two import methods: filename-based and multipart upload
- Sheet detection ("Customers" sheet or first sheet)
- Asynchronous processing via queue system
- Comprehensive import summary with row-level errors

**Dependencies**: QueueModule, Multer (file upload)

---

#### 4. **Common Module** (`src/common/`)

**Responsibility**: Shared utilities and cross-cutting concerns.

**Components**:
- `pipes/joi-validation.pipe.ts` - Reusable Joi validation
- `filters/mongo-exception.filter.ts` - Maps MongoDB errors to HTTP codes
- `interceptors/logging.interceptor.ts` - Request/response logging
- `utils/result.ts` - Generic result type for error handling

---

## Data Models

### Customer Schema

```typescript
{
  name: string (min 2 chars, indexed)
  email: string (unique, lowercase, trimmed, indexed)
  balance: number (default 0)
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

**Indexes**:
- `email`: Unique index (enforces uniqueness)
- `name`: Regular index (for search performance)

### Job Schema

```typescript
{
  type: string (e.g., "import.xlsx.customers")
  status: enum (queued, processing, succeeded, failed)
  payload: object (job-specific data)
  result?: object (job output)
  attempts: number (current retry count)
  maxAttempts: number (default 3)
  error?: string (failure reason)
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  finishedAt?: Date
}
```

**Indexes**:
- `{status: 1, createdAt: 1}`: Composite index for efficient FIFO job fetching
- `type`: Regular index for filtering by job type
- `createdAt`: Descending index for recent job queries

---

## Validation Strategy

### Two-Layer Validation

1. **Class-Validator (NestJS Global Pipe)**
   - Applied automatically to all controller endpoints
   - Handles basic type validation and transformation

2. **Joi Schemas (Custom JoiValidationPipe)**
   - Applied via `@UsePipes(new JoiValidationPipe(schema))`
   - Used for complex validation rules
   - Consistent validation for API requests and import rows
   - Detailed error messages with field-level feedback

### Example: Customer Creation

```typescript
// Joi Schema (src/customer/dtos/create-customer.joi.ts)
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  balance: Joi.number().default(0),
});

// Controller Usage
@Post()
@UsePipes(new JoiValidationPipe(createCustomerSchema))
create(@Body() createCustomerDto: CreateCustomerDto) {
  return this.customerService.create(createCustomerDto);
}
```

---

## Error Handling

### Global Exception Filter

**MongoExceptionFilter** catches MongoDB-specific errors:
- **E11000 Duplicate Key**: Maps to `409 Conflict`
- **Other MongoDB Errors**: Maps to `500 Internal Server Error`

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

### HTTP Status Codes

- `200 OK`: Successful GET, PATCH, DELETE
- `201 Created`: Successful POST (customer, job)
- `202 Accepted`: Import job enqueued
- `400 Bad Request`: Validation error
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate email
- `500 Internal Server Error`: Unexpected error

---

## Configuration Management

### Environment Variables

Managed via `@nestjs/config` with Joi validation:

```typescript
// src/config/configuration.ts
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test'),
  APP_PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  QUEUE_POLL_MS: Joi.number().default(5000),
  QUEUE_MAX_ATTEMPTS: Joi.number().default(3),
  QUEUE_STUCK_THRESHOLD_MS: Joi.number().default(300000),
  IMPORT_DATA_DIR: Joi.string().default('./data'),
});
```

### Configuration Access

```typescript
constructor(private configService: ConfigService) {
  const port = configService.get<number>('port');
  const mongoUri = configService.get<string>('mongodb.uri');
}
```

---

## Dependency Injection

NestJS's DI system manages all dependencies:

```typescript
@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
  ) {}
}
```

**Benefits**:
- Testability (easy mocking)
- Loose coupling
- Clear dependency graph
- Lifecycle management

---

## Scalability Considerations

### Current Architecture

- Single-process application
- In-process queue worker
- MongoDB for job persistence

### Scaling Options

1. **Horizontal Scaling**
   - Run multiple instances behind a load balancer
   - Queue worker uses atomic operations (safe for multiple workers)
   - MongoDB handles concurrent access

2. **Queue Scaling**
   - Current: In-process worker with polling
   - Future: Migrate to Bull/BullMQ with Redis for better performance

3. **Database Scaling**
   - MongoDB replica sets for high availability
   - Sharding for very large datasets
   - Read replicas for read-heavy workloads

---

## Security Considerations

### Current Implementation

**HTTP Security**:
- **Helmet**: XSS protection, clickjacking prevention, MIME sniffing protection
- **CORS**: Configurable via `CORS_ORIGIN` environment variable
- **Graceful Shutdown**: SIGTERM handler for proper connection draining

**Input Validation**:
- **Joi Validation**: Comprehensive schema validation on all request payloads
- **ObjectId Validation**: All MongoDB ObjectIds validated before queries (prevents CastError)
- **NoSQL Injection Prevention**: User inputs in regex filters escaped using `escapeRegExp`
- **Path Traversal Protection**: File paths validated with `path.basename()` and `..` rejection

**Database Security**:
- **Connection Hardening**: Configured with `retryWrites`, `writeConcern: majority`, connection timeouts
- **MongoDB Injection Prevention**: Mongoose ODM with parameterized queries
- **Duplicate Key Handling**: E11000 errors mapped to 409 Conflict responses

**File Handling**:
- **Upload Size Limits**: 10MB max file size
- **File Type Validation**: XLSX mimetype and extension validation
- **Automatic Cleanup**: Uploaded files deleted after processing

**Error Handling**:
- **Global Exception Filter**: Prevents internal error details from leaking to clients
- **Structured Logging**: Request/response logging with method, URL, status, timing

**Queue Security**:
- **Idempotency**: Jobs deduplicated using SHA-256 hash of type + payload
- **Atomic Operations**: Job claiming uses `findOneAndUpdate` to prevent race conditions

### For Production

- Auth (JWT/OAuth2) and RBAC
- Rate limiting
- HTTPS
- Secrets management (Vault, AWS Secrets Manager)
- MongoDB TLS
- Audit logging

---

## Performance Optimizations

1. **Database Indexes**
   - Unique index on customer email (fast uniqueness check)
   - Regular index on customer name (fast search)
   - Composite index on job status + createdAt (efficient queue polling)

2. **Repository Pattern**
   - Centralized query optimization
   - Connection pooling via Mongoose

3. **Pagination**
   - All list endpoints support pagination
   - Default limit: 10 items per page

4. **Async Processing**
   - Long-running imports processed in background
   - API responds immediately with job ID

---

## Monitoring & Observability

Current: Request/response logging, job tracking, error logs.

For production: Structured logging (Winston/Pino), APM, health checks, metrics (Prometheus).

---

## Testing Strategy

### Unit Tests
- Service layer business logic
- Custom pipes and filters
- Mocked dependencies

### E2E Tests
- Full request/response cycle
- In-memory MongoDB (mongodb-memory-server)
- Real HTTP requests via supertest

