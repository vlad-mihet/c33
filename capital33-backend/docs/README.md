# Documentation Index

Welcome to the Capital 33 Backend API documentation.

## Quick Start

New to the project? Start here:
1. Read the main [README.md](../README.md) for setup instructions
2. Check [DEVELOPMENT.md](DEVELOPMENT.md) for development workflow
3. Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system

## Documentation Overview

### For AI Assistants

- **[CLAUDE.md](../CLAUDE.md)** - Comprehensive context for Claude and other AI assistants working on this codebase. Read this first if you're an AI helping with development.

### Architecture & Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture documentation
  - Module structure and responsibilities
  - Data models and schemas
  - Validation strategy
  - Error handling
  - Scalability considerations
  - Testing strategy

### API Reference

- **[API.md](API.md)** - Complete API documentation
  - All endpoints with examples
  - Request/response formats
  - Error responses
  - cURL examples
  - XLSX import format

### Technical Deep Dives

- **[QUEUE.md](QUEUE.md)** - Queue system documentation
  - Architecture and components
  - Job lifecycle
  - Atomic operations
  - Retry logic and crash recovery
  - Adding new job types
  - Monitoring and debugging

### Development Guides

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development guide
  - Getting started
  - Feature development workflow
  - Code organization and templates
  - Debugging techniques
  - Performance optimization
  - Best practices

## Documentation by Use Case

### I want to...

**Get started with development**
→ Main [README.md](../README.md) + [DEVELOPMENT.md](DEVELOPMENT.md)

**Understand the architecture**
→ [ARCHITECTURE.md](ARCHITECTURE.md)

**Use the API**
→ [API.md](API.md) or Swagger UI at `http://localhost:3000/docs`

**Add a new feature**
→ [DEVELOPMENT.md](DEVELOPMENT.md) → "Feature Development" section

**Understand the queue system**
→ [QUEUE.md](QUEUE.md)

**Debug an issue**
→ [DEVELOPMENT.md](DEVELOPMENT.md) → "Debugging" section

**Work with Claude AI on this project**
→ [CLAUDE.md](../CLAUDE.md)

**Deploy to production**
→ [ARCHITECTURE.md](ARCHITECTURE.md) → "Scalability Considerations"

## Project Structure Quick Reference

```
capital33-backend/
├── docs/                    # This directory - all documentation
│   ├── README.md           # This file
│   ├── ARCHITECTURE.md     # System architecture
│   ├── API.md              # API reference
│   ├── QUEUE.md            # Queue system
│   └── DEVELOPMENT.md      # Development guide
├── CLAUDE.md               # AI assistant context
├── README.md               # Main readme with quick start
├── src/                    # Source code
│   ├── config/            # Configuration
│   ├── common/            # Shared utilities
│   ├── customer/          # Customer module
│   ├── queue/             # Queue module
│   ├── import/            # Import module
│   └── main.ts            # Application bootstrap
├── test/                   # Tests (unit + e2e)
│   ├── unit/              # Unit tests
│   └── e2e/               # End-to-end tests
├── data/                   # Data files (XLSX, etc.)
├── scripts/               # Utility scripts (seed, etc.)
└── .env.sample            # Environment template
```

## API Quick Reference

### Endpoints

**Customers**
- `POST /customers` - Create customer
- `GET /customers` - List customers (paginated)
- `GET /customers/:id` - Get customer by ID
- `PATCH /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

**Queue**
- `POST /queue/enqueue` - Enqueue job
- `GET /queue/:id` - Get job status
- `GET /queue` - List jobs (with filters)

**Imports**
- `POST /imports/xlsx` - Import by filename
- `POST /imports/xlsx/upload` - Upload and import

### Interactive Documentation

When the server is running, access Swagger UI at:
```
http://localhost:3000/docs
```

## Key Concepts

### Repository Pattern
Data access separated from business logic for better testability.

### Joi Validation
Consistent validation for API requests and import data.

### Mongo-Backed Queue
Lightweight background job processing without external dependencies.

### Atomic Operations
Race-condition-free job claiming using MongoDB's `findOneAndUpdate`.

## Code Examples

### Creating a New Endpoint

See [DEVELOPMENT.md](DEVELOPMENT.md) → "Creating a New Feature"

### Adding a New Job Type

See [QUEUE.md](QUEUE.md) → "Adding New Job Types"

### Writing Tests

See [DEVELOPMENT.md](DEVELOPMENT.md) → "Testing Guidelines"

## Contributing

When adding new features or fixing bugs:

1. **Update documentation** - Keep docs in sync with code
2. **Add tests** - Unit tests for services, E2E for controllers
3. **Follow patterns** - Use existing code as templates
4. **Update this index** - If you add new documentation files

## Support

- **Issues**: Check existing documentation first
- **Questions**: Review [CLAUDE.md](../CLAUDE.md) for common pitfalls
- **Swagger**: Interactive API docs at `/docs`

---

**Last Updated**: 2024-01-15
**Version**: 1.0.0
