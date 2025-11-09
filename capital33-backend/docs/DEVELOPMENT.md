# Development Guide

## Getting Started

### Prerequisites

- **Node.js**: 20 LTS or higher
- **MongoDB**: 6+ (local installation or Docker)
- **npm**: 8+ (comes with Node.js)
- **Git**: For version control

### Initial Setup

1. **Clone and Install**
```bash
cd capital33-backend
npm install
```

2. **Configure Environment**
```bash
cp .env.sample .env
```

Edit `.env` with your MongoDB connection:
```env
MONGODB_URI=mongodb://localhost:27017/capital33
APP_PORT=3000
```

3. **Start MongoDB** (if using Docker)
```bash
docker run -d -p 27017:27017 --name capital33-mongo mongo:6
```

4. **Seed Database**
```bash
npm run seed
```

5. **Generate Sample XLSX**
```bash
npx ts-node scripts/generate-sample-xlsx.ts
```

6. **Start Development Server**
```bash
npm run dev
```

Server starts at: `http://localhost:3000`
Swagger UI at: `http://localhost:3000/docs`

---

## Development Workflow

### 1. Feature Development

#### Creating a New Feature

1. **Plan the feature**
   - Identify module (customer, queue, import, or new)
   - Define endpoints and data flow
   - Design database schema if needed

2. **Create branch** (if using Git)
```bash
git checkout -b feature/feature-name
```

3. **Implement following this order**:
   - Schema (if new data model)
   - Repository (data access)
   - Service (business logic)
   - DTO with Joi validation
   - Controller (HTTP endpoints)
   - Tests (unit + e2e)
   - Documentation

4. **Test thoroughly**
```bash
npm run test
npm run test:e2e
npm run lint
```

5. **Build and verify**
```bash
npm run build
```

#### Example: Adding Customer Search

```typescript
// 1. Update DTO (src/customer/dtos/search-customer.joi.ts)
export const searchCustomerSchema = Joi.object({
  query: Joi.string().min(2).required(),
});

// 2. Add repository method (src/customer/customer.repository.ts)
async search(query: string): Promise<CustomerDocument[]> {
  return this.customerModel.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
  }).limit(10).exec();
}

// 3. Add service method (src/customer/customer.service.ts)
async search(query: string): Promise<CustomerDocument[]> {
  return this.customerRepository.search(query);
}

// 4. Add controller endpoint (src/customer/customer.controller.ts)
@Get('search')
@UsePipes(new JoiValidationPipe(searchCustomerSchema))
@ApiOperation({ summary: 'Search customers by name or email' })
search(@Query('query') query: string) {
  return this.customerService.search(query);
}
```

### 2. Code Organization

#### Module Structure

```
feature-name/
├── schemas/              # Mongoose schemas
│   └── entity.schema.ts
├── dtos/                 # Joi validation schemas
│   ├── create-entity.joi.ts
│   └── update-entity.joi.ts
├── entity.repository.ts  # Data access layer
├── entity.service.ts     # Business logic
├── entity.controller.ts  # HTTP endpoints
└── entity.module.ts      # NestJS module definition
```

#### File Templates

**Service Template**:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityRepository } from './entity.repository';
import { CreateEntityDto } from './dtos/create-entity.joi';

@Injectable()
export class EntityService {
  constructor(private readonly repository: EntityRepository) {}

  async create(dto: CreateEntityDto): Promise<Entity> {
    // Validation logic
    // Business rules
    return this.repository.create(dto);
  }

  async findAll(): Promise<Entity[]> {
    return this.repository.findAll();
  }

  async findOne(id: string): Promise<Entity> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Entity ${id} not found`);
    }
    return entity;
  }
}
```

**Controller Template**:
```typescript
import { Controller, Get, Post, Body, Param, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EntityService } from './entity.service';
import { createEntitySchema, CreateEntityDto } from './dtos/create-entity.joi';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';

@ApiTags('Entities')
@Controller('entities')
export class EntityController {
  constructor(private readonly service: EntityService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(createEntitySchema))
  @ApiOperation({ summary: 'Create new entity' })
  @ApiResponse({ status: 201, description: 'Entity created' })
  create(@Body() dto: CreateEntityDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all entities' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

### 3. Validation Patterns

#### Creating Joi Schemas

```typescript
import * as Joi from 'joi';

// Basic schema
export const createEntitySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(150).optional(),
});

// With custom messages
export const createEntitySchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'any.required': 'Name is required',
  }),
});

// With conditional validation
export const updateEntitySchema = Joi.object({
  name: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
}).min(1); // At least one field required

// With nested objects
export const complexSchema = Joi.object({
  user: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
  }).required(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').default('light'),
    notifications: Joi.boolean().default(true),
  }).optional(),
});
```

### 4. Database Queries

#### Repository Patterns

```typescript
// Simple find
async findByEmail(email: string): Promise<Customer | null> {
  return this.model.findOne({ email: email.toLowerCase() }).exec();
}

// With pagination
async findAll(skip: number, limit: number): Promise<Customer[]> {
  return this.model.find().skip(skip).limit(limit).exec();
}

// With filters
async findWithFilters(filters: any): Promise<Customer[]> {
  const query: any = {};
  if (filters.name) {
    query.name = { $regex: filters.name, $options: 'i' };
  }
  if (filters.minBalance) {
    query.balance = { $gte: filters.minBalance };
  }
  return this.model.find(query).exec();
}

// Aggregation
async getStatistics() {
  return this.model.aggregate([
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        avgBalance: { $avg: '$balance' },
        totalBalance: { $sum: '$balance' },
      },
    },
  ]);
}

// Atomic update
async incrementBalance(id: string, amount: number): Promise<Customer> {
  return this.model.findByIdAndUpdate(
    id,
    { $inc: { balance: amount } },
    { new: true }
  ).exec();
}
```

---

## Code Style

### TypeScript Conventions

```typescript
// Use explicit return types
async create(dto: CreateCustomerDto): Promise<CustomerDocument> {
  return this.repository.create(dto);
}

// Use const for immutable values
const result = await this.service.create(dto);

// Use async/await, not .then()
// ✅ Good
const customer = await this.repository.findById(id);

// ❌ Bad
this.repository.findById(id).then(customer => ...);

// Use template literals for strings
const message = `Customer ${name} created successfully`;

// Use optional chaining
const email = customer?.contact?.email;

// Use nullish coalescing
const balance = customer.balance ?? 0;
```

### Naming Conventions

- **Classes**: PascalCase - `CustomerService`, `JobRepository`
- **Functions/Methods**: camelCase - `createCustomer()`, `findById()`
- **Constants**: UPPER_SNAKE_CASE - `MAX_ATTEMPTS`, `DEFAULT_PORT`
- **Interfaces**: PascalCase with 'I' prefix (optional) - `IJobHandler`
- **Enums**: PascalCase - `JobStatus`, `JobType`
- **Files**: kebab-case - `customer.service.ts`, `job-repository.ts`

### Code Comments

```typescript
/**
 * Creates a new customer with validation and duplicate checking.
 * @param dto Customer creation data
 * @returns Created customer document
 * @throws ConflictException if email already exists
 */
async create(dto: CreateCustomerDto): Promise<CustomerDocument> {
  // Check for existing customer
  const existing = await this.repository.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException('Email already exists');
  }

  // Create customer
  return this.repository.create(dto);
}
```

**When to comment**:
- Public API methods (JSDoc)
- Complex business logic
- Non-obvious workarounds
- TODO/FIXME markers

**When not to comment**:
- Self-explanatory code
- Restating what code does
- Outdated comments

---

## Debugging

### Using NestJS Logger

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  async create(dto: CreateCustomerDto): Promise<Customer> {
    this.logger.log(`Creating customer: ${dto.email}`);

    try {
      const customer = await this.repository.create(dto);
      this.logger.log(`Customer created: ${customer._id}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Set breakpoints and press F5 to debug.

### MongoDB Shell Debugging

```bash
# Connect to database
mongosh mongodb://localhost:27017/capital33

# Useful queries
db.customers.find().pretty()
db.customers.countDocuments()
db.customers.distinct('email')

# Check indexes
db.customers.getIndexes()

# Explain query performance
db.customers.find({ email: 'test@c33.io' }).explain('executionStats')

# Find duplicates
db.customers.aggregate([
  { $group: { _id: '$email', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

---

## Performance Optimization

### Query Optimization

```typescript
// Use lean() for read-only queries (faster)
async findAll(): Promise<Customer[]> {
  return this.model.find().lean().exec();
}

// Use select() to limit fields
async findAllEmails(): Promise<string[]> {
  const customers = await this.model.find().select('email').lean().exec();
  return customers.map(c => c.email);
}

// Use indexes for filters
// Define in schema
@Schema()
export class Customer {
  @Prop({ index: true })
  status: string;
}
```

### Caching Strategies

For frequently accessed data, consider caching:

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private repository: CustomerRepository,
  ) {}

  async findOne(id: string): Promise<Customer> {
    // Check cache first
    const cached = await this.cacheManager.get<Customer>(`customer:${id}`);
    if (cached) return cached;

    // Fetch from DB
    const customer = await this.repository.findById(id);

    // Cache for 5 minutes
    await this.cacheManager.set(`customer:${id}`, customer, 300);

    return customer;
  }
}
```

---

## Environment Management

### Multiple Environments

Create environment-specific files:

```
.env.development
.env.production
.env.test
```

Load based on `NODE_ENV`:

```typescript
// src/config/configuration.ts
import { readFileSync } from 'fs';

const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
// Use with dotenv
```

### Secrets Management

**Development**: `.env` file (not committed)

**Production**: Use environment variables from:
- AWS Secrets Manager
- Azure Key Vault
- Kubernetes Secrets
- Docker Compose secrets
- Heroku Config Vars

---

## Git Workflow

### Commit Messages

Follow conventional commits:

```
feat: add customer search endpoint
fix: resolve duplicate email validation issue
docs: update API documentation for queue endpoints
refactor: extract validation logic to separate service
test: add e2e tests for import flow
chore: update dependencies
```

### Branch Strategy

```
main (production)
  └── develop
      ├── feature/customer-search
      ├── feature/email-notifications
      └── fix/queue-retry-logic
```

### Pre-commit Checks

Create `.husky/pre-commit`:

```bash
#!/bin/sh
npm run lint
npm run test
npm run build
```

---

## Monitoring in Development

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: this.configService.get('mongodb.uri') ? 'connected' : 'disconnected',
    };
  }
}
```

### Request Logging

Already implemented via `LoggingInterceptor`:

```
[HTTP] GET /customers 200 - 45ms
[HTTP] POST /customers 201 - 120ms
[HTTP] GET /queue/123 404 - 12ms
```

---

## Common Development Tasks

### Reset Database

```bash
# Drop all collections
mongosh mongodb://localhost:27017/capital33 --eval "db.dropDatabase()"

# Reseed
npm run seed
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all minor/patch versions
npm update

# Update major versions (carefully)
npm install package@latest
```

### Generate New Module

```bash
# Using NestJS CLI
nest generate module feature-name
nest generate service feature-name
nest generate controller feature-name
```

### Debug Queue Processing

```bash
# List queued jobs
curl http://localhost:3000/queue?status=queued

# Trigger manual processing (create test job)
curl -X POST http://localhost:3000/queue/enqueue \
  -H "Content-Type: application/json" \
  -d '{"type":"test","payload":{}}'

# Watch logs
npm run dev # Logs show worker activity
```

---

## Best Practices Checklist

- [ ] All endpoints have Joi validation
- [ ] Services have proper error handling
- [ ] New features have unit tests
- [ ] E2E tests cover happy path
- [ ] Database queries use indexes
- [ ] API documented with Swagger decorators
- [ ] Code follows naming conventions
- [ ] No secrets in code (use .env)
- [ ] Async operations use async/await
- [ ] Repository pattern for data access
- [ ] Business logic in services, not controllers
- [ ] DTOs for request/response types
- [ ] Proper HTTP status codes
- [ ] Meaningful error messages

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh mongodb://localhost:27017

# Start MongoDB (Docker)
docker start capital33-mongo

# Check connection string in .env
cat .env | grep MONGODB_URI
```

### Build Errors

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

### Test Failures

```bash
# Run single test file
npm test -- customer.service.spec.ts

# Run with coverage
npm run test:cov

# Debug tests
node --inspect-brk node_modules/.bin/jest --runInBand
```
