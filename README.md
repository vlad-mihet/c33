# Capital 33 Backend API

NestJS backend for Capital 33. Manages customers, processes background jobs, and handles bulk XLSX imports.

## Features

- Customer CRUD with pagination and filtering
- Mongo-backed job queue with visibility timeout and retries
- XLSX import with manifest routing and row validation
- Joi validation for all inputs
- Swagger documentation at `/docs`
- Security: Helmet, CORS, input validation

## Prerequisites

- Node.js 20 LTS
- MongoDB 6+ (local or Atlas)

## Quick Start

1. **Install**

```bash
npm install
```

2. **Configure**

```bash
cp .env.sample .env
# Edit .env with your MONGODB_URI
```

3. **Run**

```bash
npm run dev
```

The server starts on **http://localhost:3000**
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`

## Documentation

- **[API Reference](docs/reference/api.md)** - Complete endpoint documentation
- **[Environment Variables](docs/reference/environment.md)** - Configuration reference
- **[Queue & Imports](docs/architecture/queue-imports.md)** - Background processing explained

For development workflow, architecture details, and troubleshooting, see [docs/](docs/).

## Example Usage

```bash
# Create a customer
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@c33.io","balance":1200}'

# List customers
curl http://localhost:3000/api/v1/customers?page=1&limit=10
```

## Testing

```bash
npm test            # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
```

## License

UNLICENSED
