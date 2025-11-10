# API Reference

## Base URL

```
http://localhost:3000/api/v1
```

## Interactive Documentation

Swagger UI at `http://localhost:3000/docs` has all endpoints, schemas, and a try-it-now interface.

---

## Quick Examples

### Create a Customer

```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@c33.io","balance":1200}'
```

**Success (201)**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ada Lovelace",
  "email": "ada@c33.io",
  "balance": 1200,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Error (400 - Validation)**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {"field": "email", "message": "Email must be a valid email address"}
  ]
}
```

**Error (409 - Conflict)**:
```json
{
  "statusCode": 409,
  "message": "Duplicate entry for field: email",
  "error": "Conflict"
}
```

### List Customers

```bash
curl "http://localhost:3000/api/v1/customers?page=1&limit=10&name=Ada"
```

**Response (200)**:
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Ada Lovelace",
      "email": "ada@c33.io",
      "balance": 1200,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

## Endpoints

### Customers

- `POST /api/v1/customers` - Create customer
- `GET /api/v1/customers` - List customers (paginated, filterable by name/email)
- `GET /api/v1/customers/:id` - Get customer by ID
- `PATCH /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer

### Queue

- `POST /api/v1/queue/enqueue` - Enqueue background job
- `GET /api/v1/queue/:id` - Get job status and result
- `GET /api/v1/queue` - List jobs (filterable by status/type)

### Imports

- `POST /api/v1/imports/xlsx` - Import XLSX by filename
- `POST /api/v1/imports/xlsx/upload` - Upload and import XLSX

See Swagger at `/docs` for full parameter and validation details.

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Successful GET, PATCH, DELETE |
| 201 | Created - Successful POST (customer, job created) |
| 202 | Accepted - Job enqueued (async operation) |
| 400 | Bad Request - Validation error, invalid input |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate email or idempotent job resubmission |
| 500 | Internal Server Error - Unexpected error |

---

## Error Response Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Human-readable error description",
  "error": "BadRequest",
  "errors": [
    {"field": "fieldName", "message": "Field-specific error"}
  ]
}
```

The `errors` array is present for validation errors (400) with multiple field failures.
