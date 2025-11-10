# Documentation Index

Welcome to the Capital 33 Backend API documentation.

## Quick Start

Start with [README.md](../README.md) for setup, then [DEVELOPMENT.md](DEVELOPMENT.md) for workflow.

## Documentation Overview

### Reference

- **[reference/api.md](reference/api.md)** - Endpoints and examples
- **[reference/environment.md](reference/environment.md)** - Config vars

### Architecture

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System overview
- **[architecture/queue-imports.md](architecture/queue-imports.md)** - Queue & imports

### Development

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Workflow and patterns

## Common Tasks

- **Get started**: [README.md](../README.md) + [DEVELOPMENT.md](DEVELOPMENT.md)
- **Understand architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Use the API**: [reference/api.md](reference/api.md) or Swagger at `/docs`
- **Add a feature**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **Queue & imports**: [architecture/queue-imports.md](architecture/queue-imports.md)
- **Configure env**: [reference/environment.md](reference/environment.md)
- **Debug**: [DEVELOPMENT.md](DEVELOPMENT.md)

## Project Structure Quick Reference

```
capital33-backend/
├── docs/
│   ├── reference/
│   │   ├── api.md
│   │   └── environment.md
│   ├── architecture/
│   │   └── queue-imports.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPMENT.md
├── src/
│   ├── config/
│   ├── common/
│   ├── customer/
│   ├── queue/
│   ├── import/
│   └── main.ts
├── test/
│   ├── unit/
│   └── e2e/
├── data/
├── scripts/
└── .env.sample
```

## API Quick Reference

### Endpoints

**Customers**
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers` - List customers (paginated)
- `GET /api/v1/customers/:id` - Get customer by ID
- `PATCH /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

**Queue**
- `POST /api/v1/queue/enqueue` - Enqueue job
- `GET /api/v1/queue/:id` - Get job status
- `GET /api/v1/queue` - List jobs (with filters)

**Imports**
- `POST /api/v1/imports/xlsx` - Import by filename
- `POST /api/v1/imports/xlsx/upload` - Upload and import

### Interactive Documentation

When the server is running, access Swagger UI at:
```
http://localhost:3000/docs
```

## Key Patterns

- **Repository Pattern**: Data access separated from business logic
- **Joi Validation**: Same validation for API requests and import data
- **Mongo Queue**: Background jobs without Redis/RabbitMQ
- **Atomic Operations**: Job claiming via `findOneAndUpdate`
