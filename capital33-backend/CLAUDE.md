# Claude Context: Capital 33 Backend

This document provides comprehensive context for AI assistants (particularly Claude) working on the Capital 33 Backend codebase.

## Project Overview

**Name**: Capital 33 Backend API
**Purpose**: Production-grade NestJS backend for Capital 33 fintech platform
**Tech Stack**: Node.js 20, TypeScript, NestJS 11, MongoDB 6+, Mongoose
**Architecture**: Modular monolith with repository pattern and clean architecture principles

## Quick Navigation

- **Documentation**: `/docs/` directory
  - `ARCHITECTURE.md` - System architecture and design decisions
  - `API.md` - Complete API reference with examples
  - `QUEUE.md` - Background job processing system
- **Source Code**: `/src/` directory
- **Tests**: `/test/` directory (unit + e2e)
- **Configuration**: `.env.sample`, `src/config/configuration.ts`

## Project Structure

```
src/
├── config/                      # Environment configuration with Joi validation
├── common/                      # Shared utilities
│   ├── pipes/                   # JoiValidationPipe (reusable validation)
│   ├── filters/                 # MongoExceptionFilter (409 Conflict handling)
│   ├── interceptors/            # LoggingInterceptor (request/response logging)
│   └── utils/                   # Result types, helpers
├── customer/                    # Customer CRUD module
│   ├── schemas/                 # Mongoose schemas
│   ├── dtos/                    # Joi validation schemas
│   ├── customer.repository.ts   # Data access layer
│   ├── customer.service.ts      # Business logic
│   ├── customer.controller.ts   # HTTP endpoints
│   └── customer.module.ts       # NestJS module
├── queue/                       # Background job queue
│   ├── schemas/                 # Job schema
│   ├── handlers/                # Job type handlers
│   ├── job.repository.ts        # Job data access with atomic operations
│   ├── queue.service.ts         # Job creation and querying
│   ├── queue.worker.ts          # Background worker with polling
│   ├── queue.controller.ts      # Queue API
│   └── queue.module.ts          # Module with handler registration
├── import/                      # XLSX import functionality
│   ├── utils/xlsx.util.ts       # XLSX parsing utilities
│   ├── imports.service.ts       # Import orchestration
│   ├── imports.controller.ts    # Import endpoints
│   └── import.module.ts         # Import module
├── app.module.ts                # Root module
└── main.ts                      # Application bootstrap with Swagger
```

## Core Concepts

### 1. Repository Pattern

We use the repository pattern to separate data access from business logic:

```typescript
// Repository: Data access only
@Injectable()
export class CustomerRepository {
  constructor(@InjectModel(Customer.name) private model: Model<CustomerDocument>) {}

  async create(data: Partial<Customer>): Promise<CustomerDocument> {
    const customer = new this.model(data);
    return customer.save();
  }
}

// Service: Business logic
@Injectable()
export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async create(dto: CreateCustomerDto): Promise<CustomerDocument> {
    // Check for duplicates (business logic)
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) throw new ConflictException();

    return this.repository.create(dto);
  }
}
```

**Why**: Easier testing, clear separation of concerns, business logic isolated from data access.

### 2. Joi Validation

We use Joi for validation instead of class-validator decorators:

```typescript
// DTO with Joi schema
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  balance: Joi.number().default(0),
});

export interface CreateCustomerDto {
  name: string;
  email: string;
  balance?: number;
}

// Controller usage
@Post()
@UsePipes(new JoiValidationPipe(createCustomerSchema))
create(@Body() dto: CreateCustomerDto) {
  return this.service.create(dto);
}
```

**Why**: Consistent validation for API requests and import data, better error messages, more flexible.

### 3. Queue System Architecture

Lightweight MongoDB-backed queue with atomic operations:

```typescript
// Atomic job claiming (prevents race conditions)
async claimNextJob(): Promise<JobDocument | null> {
  return this.jobModel.findOneAndUpdate(
    { status: 'queued' },
    { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    { new: true, sort: { createdAt: 1 } }
  ).exec();
}
```

**Key Features**:
- No external dependencies (Redis, RabbitMQ)
- FIFO processing with MongoDB sort
- Retry logic with configurable max attempts
- Crash recovery (unsticks stale jobs)
- Handler registry for extensibility

**Job Lifecycle**: queued → processing → succeeded/failed (with retries)

### 4. Import System

XLSX imports are processed asynchronously via the queue:

```typescript
// 1. Controller enqueues job
@Post('xlsx')
async importByFilename(@Body('filename') filename: string) {
  const job = await this.importsService.importXlsxByFilename(filename);
  return { jobId: job._id, status: job.status };
}

// 2. Worker processes job via ImportXlsxHandler
async handle(job: JobDocument): Promise<ImportSummary> {
  const rows = parseXlsxFile(job.payload.filePath);

  for (const row of rows) {
    // Validate with Joi
    // Upsert by email (deduplication)
  }

  return { totalRows, inserted, updated, failed, errors };
}
```

**Deduplication**: Uses `upsertByEmail()` to insert new or update existing customers.

## Common Tasks

### Adding a New Endpoint

1. **Create DTO with Joi schema** (if needed):
```typescript
// src/customer/dtos/new-endpoint.joi.ts
export const newEndpointSchema = Joi.object({
  field: Joi.string().required(),
});

export interface NewEndpointDto {
  field: string;
}
```

2. **Add service method**:
```typescript
// src/customer/customer.service.ts
async newMethod(dto: NewEndpointDto): Promise<Result> {
  // Business logic
  return this.repository.someMethod(dto);
}
```

3. **Add controller endpoint**:
```typescript
// src/customer/customer.controller.ts
@Post('new-endpoint')
@UsePipes(new JoiValidationPipe(newEndpointSchema))
@ApiOperation({ summary: 'Description' })
@ApiResponse({ status: 201, description: 'Success' })
@ApiResponse({ status: 400, description: 'Validation failed' })
newEndpoint(@Body() dto: NewEndpointDto) {
  return this.service.newMethod(dto);
}
```

**Important**: For endpoints with MongoDB ObjectId parameters, always use `ObjectIdValidationPipe`:
```typescript
@Get(':id')
@ApiResponse({ status: 200, description: 'Found' })
@ApiResponse({ status: 400, description: 'Invalid ObjectId' })
@ApiResponse({ status: 404, description: 'Not found' })
findOne(@Param('id', ObjectIdValidationPipe) id: string) {
  return this.service.findOne(id);
}
```

### Adding a New Job Type

1. **Define constant**:
```typescript
// src/queue/queue.constants.ts
export enum JobType {
  NEW_JOB = 'new.job.type',
}
```

2. **Create handler**:
```typescript
// src/queue/handlers/new-job.handler.ts
@Injectable()
export class NewJobHandler implements IJobHandler {
  async handle(job: JobDocument): Promise<JobResult> {
    // Job logic
    return { success: true };
  }
}
```

3. **Register in QueueModule**:
```typescript
// src/queue/queue.module.ts
providers: [NewJobHandler],

onModuleInit() {
  const handler = this.moduleRef.get(NewJobHandler);
  this.worker.registerHandler(JobType.NEW_JOB, handler);
}
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests (uses mongodb-memory-server)
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### Database Queries

```bash
# Connect to local MongoDB
mongosh mongodb://localhost:27017/capital33

# Common queries
db.customers.find({})
db.customers.find({ email: /c33.io/ })
db.jobs.find({ status: 'failed' })
db.jobs.countDocuments({ status: 'queued' })
```

## Important Conventions

### 1. File Naming

- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts`
- **Repositories**: `*.repository.ts`
- **Schemas**: `*.schema.ts`
- **DTOs**: `*.joi.ts` (Joi validation)
- **Tests**: `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e)

### 2. Import Organization

```typescript
// 1. External imports
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

// 2. Internal imports (relative paths)
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dtos/create-customer.joi';

// 3. Type imports (use 'type' keyword for TS compatibility)
import type { ObjectSchema } from 'joi';
```

### 3. Error Handling

```typescript
// Service layer
if (!customer) {
  throw new NotFoundException(`Customer with ID ${id} not found`);
}

if (duplicate) {
  throw new ConflictException('Email already exists');
}

// Global filter catches MongoDB errors
// E11000 → 409 Conflict (automatic)
```

### 4. Async/Await

Always use async/await, never callbacks or raw promises:

```typescript
// ✅ Good
async create(dto: CreateCustomerDto): Promise<Customer> {
  const customer = await this.repository.create(dto);
  return customer;
}

// ❌ Bad
create(dto: CreateCustomerDto): Promise<Customer> {
  return this.repository.create(dto).then(customer => customer);
}
```

### 5. Type Safety

Use TypeScript strictly:

```typescript
// ✅ Good
async findById(id: string): Promise<CustomerDocument | null> {
  return this.customerModel.findById(id).exec();
}

// ❌ Bad
async findById(id: any): Promise<any> {
  return this.customerModel.findById(id).exec();
}
```

## Environment Variables

Required variables in `.env`:

```env
# Application
APP_PORT=3000
NODE_ENV=development

# Security
CORS_ORIGIN=http://localhost:3000

# MongoDB (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/capital33

# Queue (Optional, has defaults)
QUEUE_POLL_MS=5000
QUEUE_MAX_ATTEMPTS=3
QUEUE_STUCK_THRESHOLD_MS=300000

# Import (Optional, has defaults)
IMPORT_DATA_DIR=./data
```

## MongoDB Indexes

### Customer Collection

```javascript
// Unique index (enforces email uniqueness)
db.customers.createIndex({ email: 1 }, { unique: true })

// Regular index (search performance)
db.customers.createIndex({ name: 1 })
```

### Job Collection

```javascript
// Composite index (FIFO queue processing)
db.jobs.createIndex({ status: 1, createdAt: 1 })

// Type filtering
db.jobs.createIndex({ type: 1 })

// Recent jobs
db.jobs.createIndex({ createdAt: -1 })
```

**Auto-created**: Indexes are created automatically on application startup via `onModuleInit()` hooks.

## Security Best Practices

### 1. Input Validation

**Always validate ObjectIds**:
```typescript
// ✅ Good - Using ObjectIdValidationPipe
@Get(':id')
findOne(@Param('id', ObjectIdValidationPipe) id: string) {
  return this.service.findOne(id);
}

// ❌ Bad - No validation, causes CastError on invalid input
@Get(':id')
findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}
```

**Escape user input in regex filters**:
```typescript
import { escapeRegExp } from 'lodash';

// ✅ Good - Escaped regex prevents ReDoS attacks
if (name) {
  filter.name = { $regex: escapeRegExp(name), $options: 'i' };
}

// ❌ Bad - Unescaped user input allows malicious regex
if (name) {
  filter.name = { $regex: name, $options: 'i' };
}
```

**Validate file paths**:
```typescript
// ✅ Good - Path traversal protection
const basename = path.basename(filename);
if (basename !== filename || filename.includes('..')) {
  throw new BadRequestException('Invalid filename');
}

// ❌ Bad - Allows directory traversal
const filePath = path.join(dataDir, filename);
```

### 2. Queue Idempotency

Jobs are automatically deduplicated using an idempotency key (SHA-256 hash of type + payload):
```typescript
// Queue service automatically generates this:
const idempotencyKey = createHash('sha256')
  .update(dto.type + JSON.stringify(dto.payload))
  .digest('hex');
```

### 3. File Cleanup

Uploaded files are automatically cleaned up after processing:
```typescript
// The import handler automatically does this in finally block:
if (filePath.includes('upload-')) {
  await fs.unlink(filePath);
}
```

### 4. Security Middleware

Configured in `main.ts`:
- **Helmet**: Protects against common web vulnerabilities
- **CORS**: Configurable via `CORS_ORIGIN` environment variable
- **Graceful Shutdown**: SIGTERM handler for proper cleanup

## Common Pitfalls

### 1. Forgetting to Read File Before Editing

```typescript
// ❌ Will fail - file not read first
await Edit({ file_path: './src/file.ts', old_string: 'foo', new_string: 'bar' });

// ✅ Correct - read first
await Read({ file_path: './src/file.ts' });
await Edit({ file_path: './src/file.ts', old_string: 'foo', new_string: 'bar' });
```

### 2. Import Type Errors

```typescript
// ❌ Causes TS1272 error with isolatedModules
import { ObjectSchema } from 'joi';

// ✅ Correct
import type { ObjectSchema } from 'joi';
```

### 3. Mongoose Type Issues

```typescript
// ❌ Type error with findOneAndUpdate
const result = await this.model.findOneAndUpdate(
  { email },
  { $set: data },
  { new: true, upsert: true, rawResult: true }
);
return result.value; // Type error!

// ✅ Correct approach
const existing = await this.findByEmail(email);
const wasNew = !existing;
const result = await this.model.findOneAndUpdate(
  { email },
  { $set: data },
  { new: true, upsert: true }
);
return { customer: result!, wasNew };
```

### 4. Circular Dependencies

Avoid importing modules that depend on each other:

```typescript
// ❌ Bad: CustomerModule imports QueueModule, QueueModule imports CustomerModule
// This can cause initialization issues

// ✅ Good: QueueModule imports CustomerModule only (one-way dependency)
```

### 5. Missing Validation

Always use Joi validation for new endpoints:

```typescript
// ❌ Bad: No validation
@Post()
create(@Body() dto: any) { ... }

// ✅ Good: Joi validation
@Post()
@UsePipes(new JoiValidationPipe(createCustomerSchema))
create(@Body() dto: CreateCustomerDto) { ... }
```

## Debugging

### Enable Debug Logging

```bash
# Start with debug logging
npm run start:debug
```

### Check Queue Status

```bash
# List all queued jobs
curl http://localhost:3000/queue?status=queued

# Check specific job
curl http://localhost:3000/queue/<jobId>

# Failed jobs
curl http://localhost:3000/queue?status=failed
```

### MongoDB Debugging

```javascript
// Find stuck jobs
db.jobs.find({
  status: 'processing',
  startedAt: { $lt: new Date(Date.now() - 300000) }
})

// Check customer duplicates
db.customers.aggregate([
  { $group: { _id: '$email', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

## Testing Guidelines

### Unit Test Structure

```typescript
describe('CustomerService', () => {
  let service: CustomerService;
  let repository: CustomerRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: CustomerRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repository = module.get<CustomerRepository>(CustomerRepository);
  });

  it('should create a customer', async () => {
    // Arrange
    const dto = { name: 'Test', email: 'test@c33.io' };
    jest.spyOn(repository, 'create').mockResolvedValue(mockCustomer);

    // Act
    const result = await service.create(dto);

    // Assert
    expect(result).toEqual(mockCustomer);
    expect(repository.create).toHaveBeenCalledWith(dto);
  });
});
```

### E2E Test Structure

```typescript
describe('CustomerController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        CustomerModule,
      ],
    }).compile();

    app = module.createNestApplication();
    // Apply global filters/pipes/interceptors
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('POST /customers', () => {
    return request(app.getHttpServer())
      .post('/customers')
      .send({ name: 'Test', email: 'test@c33.io' })
      .expect(201);
  });
});
```

## Performance Tips

1. **Use indexes**: All queries on `email`, `name`, `status` use indexes
2. **Pagination**: Always use pagination for list endpoints (default limit: 10)
3. **Async processing**: Long-running tasks go through queue (imports)
4. **Connection pooling**: Mongoose handles this automatically
5. **Lean queries**: Use `.lean()` for read-only queries (faster)

```typescript
// For read-only data (no Mongoose document methods needed)
const customers = await this.customerModel.find().lean().exec();
```

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production MongoDB URI (Atlas or hosted)
- [ ] Set strong secrets for any auth (not implemented yet)
- [ ] Enable CORS with whitelist
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Set up monitoring (logs, metrics)
- [ ] Configure MongoDB replica set
- [ ] Scale workers horizontally if needed
- [ ] Set up automated backups

## Useful Commands

```bash
# Development
npm run dev                 # Start with watch mode
npm run start:debug         # Start with debugging

# Building
npm run build               # Build TypeScript
npm run start:prod          # Start production build

# Testing
npm run test                # Unit tests
npm run test:e2e            # E2E tests
npm run test:cov            # Coverage report

# Code Quality
npm run lint                # Run ESLint
npm run format              # Run Prettier

# Database
npm run seed                # Seed sample customers

# Generate sample XLSX
npx ts-node scripts/generate-sample-xlsx.ts
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/main.ts` | Application bootstrap, Swagger setup, global pipes/filters |
| `src/app.module.ts` | Root module, imports all feature modules |
| `src/config/configuration.ts` | Environment config with Joi validation |
| `src/common/pipes/joi-validation.pipe.ts` | Reusable Joi validation pipe |
| `src/common/filters/mongo-exception.filter.ts` | Maps MongoDB errors to HTTP codes |
| `src/customer/customer.service.ts` | Customer business logic |
| `src/queue/queue.worker.ts` | Background job processor |
| `src/queue/handlers/import-xlsx.handler.ts` | XLSX import job handler |
| `.env.sample` | Environment variable template |

## When Making Changes

1. **Read the code first**: Always read files before editing
2. **Follow patterns**: Use existing code as templates
3. **Add tests**: Unit tests for services, E2E for controllers
4. **Update docs**: Update relevant docs in `/docs/` directory
5. **Run tests**: `npm run test && npm run test:e2e`
6. **Check build**: `npm run build`
7. **Format code**: `npm run format`

## Contact & Support

- **Documentation**: `/docs/` directory
- **Swagger UI**: `http://localhost:3000/docs` (when running)
- **GitHub Issues**: (not set up in take-home)
- **README**: Root `README.md` for quick start

## Architecture Decision Records (ADRs)

### Why MongoDB for Queue?

**Decision**: Use MongoDB instead of Redis/RabbitMQ

**Rationale**:
- Single database dependency (simpler ops)
- Atomic operations prevent race conditions
- Sufficient for moderate throughput (<1000 jobs/min)
- Easy to query job history
- No additional infrastructure cost

**Trade-offs**:
- Slower than Redis (acceptable for async jobs)
- Limited advanced features (priority, delayed jobs)
- May need migration at high scale

**Migration Path**: Replace with BullMQ (Redis) if throughput exceeds 1000 jobs/min

### Why Joi over Class-Validator?

**Decision**: Use Joi for validation instead of class-validator decorators

**Rationale**:
- Same validation for API and import data
- Better error messages (customizable)
- More flexible for complex schemas
- Easier to test in isolation

**Trade-offs**:
- Less integrated with NestJS (manual pipe application)
- More verbose than decorators
- Need separate interface + schema

### Why Repository Pattern?

**Decision**: Use repository pattern instead of direct Mongoose in services

**Rationale**:
- Easier unit testing (mock repository)
- Clear separation: data access vs business logic
- Can swap ORM without changing services
- Centralized query optimization

**Trade-offs**:
- Extra layer of abstraction
- More files to maintain
- Slightly more boilerplate

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
**Maintained for**: Claude Code AI Assistant
