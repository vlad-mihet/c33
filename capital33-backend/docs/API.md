# API Reference

## Base URL

```
http://localhost:3000
```

## Interactive Documentation

Swagger UI available at: `http://localhost:3000/docs`

---

## Customer Endpoints

### Create Customer

Create a new customer in the system.

**Endpoint**: `POST /customers`

**Request Body**:
```json
{
  "name": "Ada Lovelace",
  "email": "ada@c33.io",
  "balance": 1200
}
```

**Validation Rules**:
- `name`: Required, minimum 2 characters
- `email`: Required, valid email format, must be unique
- `balance`: Optional, number, defaults to 0

**Success Response** (201 Created):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ada Lovelace",
  "email": "ada@c33.io",
  "balance": 1200,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "__v": 0
}
```

**Error Responses**:

400 Bad Request (Validation Error):
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

409 Conflict (Duplicate Email):
```json
{
  "statusCode": 409,
  "message": "Duplicate entry for field: email",
  "error": "Conflict"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ada Lovelace",
    "email": "ada@c33.io",
    "balance": 1200
  }'
```

---

### Get All Customers

Retrieve a paginated list of customers with optional filtering.

**Endpoint**: `GET /customers`

**Query Parameters**:
- `page` (optional): Page number, defaults to 1
- `limit` (optional): Items per page, defaults to 10
- `name` (optional): Filter by name (case-insensitive partial match)
- `email` (optional): Filter by email (case-insensitive partial match)

**Success Response** (200 OK):
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

**cURL Examples**:
```bash
# Basic pagination
curl "http://localhost:3000/customers?page=1&limit=10"

# With name filter
curl "http://localhost:3000/customers?name=Ada"

# With email filter
curl "http://localhost:3000/customers?email=c33.io"

# Combined filters
curl "http://localhost:3000/customers?name=Ada&email=c33.io&page=1&limit=5"
```

---

### Get Customer by ID

Retrieve a single customer by their ID.

**Endpoint**: `GET /customers/:id`

**Path Parameters**:
- `id`: MongoDB ObjectId of the customer

**Success Response** (200 OK):
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

**Error Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Customer with ID 507f1f77bcf86cd799439011 not found",
  "error": "Not Found"
}
```

**cURL Example**:
```bash
curl http://localhost:3000/customers/507f1f77bcf86cd799439011
```

---

### Update Customer

Update an existing customer's information.

**Endpoint**: `PATCH /customers/:id`

**Path Parameters**:
- `id`: MongoDB ObjectId of the customer

**Request Body** (all fields optional):
```json
{
  "name": "Ada Lovelace Updated",
  "email": "ada.new@c33.io",
  "balance": 1500
}
```

**Validation Rules**:
- At least one field must be provided
- `name`: Minimum 2 characters if provided
- `email`: Valid email format if provided, must be unique
- `balance`: Must be a number if provided

**Success Response** (200 OK):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ada Lovelace Updated",
  "email": "ada.new@c33.io",
  "balance": 1500,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses**:

404 Not Found:
```json
{
  "statusCode": 404,
  "message": "Customer with ID 507f1f77bcf86cd799439011 not found"
}
```

409 Conflict (Email already exists):
```json
{
  "statusCode": 409,
  "message": "Email already exists"
}
```

**cURL Example**:
```bash
curl -X PATCH http://localhost:3000/customers/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"balance": 1500}'
```

---

### Delete Customer

Delete a customer from the system.

**Endpoint**: `DELETE /customers/:id`

**Path Parameters**:
- `id`: MongoDB ObjectId of the customer

**Success Response** (200 OK):
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

**Error Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Customer with ID 507f1f77bcf86cd799439011 not found"
}
```

**cURL Example**:
```bash
curl -X DELETE http://localhost:3000/customers/507f1f77bcf86cd799439011
```

---

## Queue Endpoints

### Enqueue Job

Create a new background job in the queue.

**Endpoint**: `POST /queue/enqueue`

**Request Body**:
```json
{
  "type": "import.xlsx.customers",
  "payload": {
    "filePath": "./data/customers.sample.xlsx"
  },
  "maxAttempts": 3
}
```

**Fields**:
- `type`: Job type identifier (e.g., "import.xlsx.customers")
- `payload`: Job-specific data (object)
- `maxAttempts`: Optional, maximum retry attempts (defaults to 3)

**Success Response** (201 Created):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "import.xlsx.customers",
  "status": "queued",
  "payload": {
    "filePath": "./data/customers.sample.xlsx"
  },
  "attempts": 0,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/queue/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "type": "import.xlsx.customers",
    "payload": {"filePath": "./data/customers.sample.xlsx"}
  }'
```

---

### Get Job Status

Retrieve the status and result of a job.

**Endpoint**: `GET /queue/:id`

**Path Parameters**:
- `id`: MongoDB ObjectId of the job

**Success Response** (200 OK - Queued):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "import.xlsx.customers",
  "status": "queued",
  "payload": {
    "filePath": "./data/customers.sample.xlsx"
  },
  "attempts": 0,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

**Success Response** (200 OK - Succeeded):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "import.xlsx.customers",
  "status": "succeeded",
  "payload": {
    "filePath": "./data/customers.sample.xlsx"
  },
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
  },
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:15.000Z",
  "startedAt": "2024-01-15T10:00:05.000Z",
  "finishedAt": "2024-01-15T10:00:15.000Z"
}
```

**Success Response** (200 OK - Failed):
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "type": "import.xlsx.customers",
  "status": "failed",
  "payload": {
    "filePath": "./data/nonexistent.xlsx"
  },
  "error": "Failed to parse XLSX file: ENOENT: no such file or directory",
  "attempts": 3,
  "maxAttempts": 3,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:45.000Z",
  "finishedAt": "2024-01-15T10:00:45.000Z"
}
```

**Error Response** (404 Not Found):
```json
{
  "statusCode": 404,
  "message": "Job with ID 507f1f77bcf86cd799439012 not found"
}
```

**cURL Example**:
```bash
curl http://localhost:3000/queue/507f1f77bcf86cd799439012
```

---

### List Jobs

Retrieve a list of jobs with optional filtering.

**Endpoint**: `GET /queue`

**Query Parameters**:
- `status` (optional): Filter by status (queued, processing, succeeded, failed)
- `type` (optional): Filter by job type
- `limit` (optional): Maximum number of jobs to return (defaults to 100)

**Success Response** (200 OK):
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "type": "import.xlsx.customers",
    "status": "queued",
    "payload": {...},
    "attempts": 0,
    "maxAttempts": 3,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "type": "import.xlsx.customers",
    "status": "succeeded",
    "payload": {...},
    "result": {...},
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:15.000Z",
    "finishedAt": "2024-01-15T09:00:15.000Z"
  }
]
```

**cURL Examples**:
```bash
# All jobs
curl http://localhost:3000/queue

# Filter by status
curl "http://localhost:3000/queue?status=failed"

# Filter by type
curl "http://localhost:3000/queue?type=import.xlsx.customers"

# Combined filters
curl "http://localhost:3000/queue?status=succeeded&type=import.xlsx.customers&limit=50"
```

---

## Import Endpoints

### Import by Filename

Trigger an import for a file already in the data directory.

**Endpoint**: `POST /imports/xlsx`

**Request Body**:
```json
{
  "filename": "customers.sample.xlsx"
}
```

**Success Response** (202 Accepted):
```json
{
  "message": "Import job enqueued successfully",
  "jobId": "507f1f77bcf86cd799439013",
  "status": "queued"
}
```

**Error Response** (400 Bad Request):
```json
{
  "statusCode": 400,
  "message": "Filename is required"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/imports/xlsx \
  -H "Content-Type: application/json" \
  -d '{"filename": "customers.sample.xlsx"}'
```

---

### Upload and Import

Upload an XLSX file and trigger import.

**Endpoint**: `POST /imports/xlsx/upload`

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `file`: XLSX file (max 10MB)

**Success Response** (202 Accepted):
```json
{
  "message": "File uploaded and import job enqueued successfully",
  "filename": "upload-1642248000000-123456789.xlsx",
  "jobId": "507f1f77bcf86cd799439014",
  "status": "queued"
}
```

**Error Responses**:

400 Bad Request (No file):
```json
{
  "statusCode": 400,
  "message": "File is required"
}
```

400 Bad Request (Invalid file type):
```json
{
  "statusCode": 400,
  "message": "Only XLSX files are allowed"
}
```

400 Bad Request (File too large):
```json
{
  "statusCode": 400,
  "message": "File size exceeds 10MB limit"
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/imports/xlsx/upload \
  -F "file=@./data/customers.sample.xlsx"
```

---

### Check Import Result

After triggering an import, use the job ID to check progress and results:

```bash
# Get job status
curl http://localhost:3000/queue/<jobId>
```

**Import Result Format**:
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
      {
        "row": 5,
        "reason": "Email must be a valid email address"
      }
    ]
  }
}
```

**Fields**:
- `totalRows`: Total rows parsed from XLSX
- `valid`: Rows that passed validation
- `inserted`: New customers created
- `updated`: Existing customers updated (by email)
- `skipped`: Rows skipped during processing
- `failed`: Rows that failed validation
- `errors`: Array of validation errors with row number and reason

---

## Status Codes Summary

| Code | Description |
|------|-------------|
| 200  | OK - Request successful (GET, PATCH, DELETE) |
| 201  | Created - Resource created (POST customer, job) |
| 202  | Accepted - Job enqueued (POST import) |
| 400  | Bad Request - Validation error |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Duplicate email |
| 500  | Internal Server Error - Unexpected error |

---

## Rate Limiting

Currently not implemented. For production, consider:
- Rate limit per IP: 100 requests/minute
- Rate limit per authenticated user: 1000 requests/minute
- Bulk import: 10 imports/hour per user

---

## Pagination Best Practices

For optimal performance with large datasets:

1. **Use reasonable page sizes**
   - Default: 10 items
   - Maximum recommended: 100 items

2. **Filter when possible**
   - Use `name` and `email` filters to reduce result set
   - Filters use MongoDB regex with indexes

3. **Example efficient query**:
```bash
curl "http://localhost:3000/customers?name=John&limit=20"
```

---

## XLSX Import Format

### Expected Columns

The XLSX file should have these columns (case-insensitive):

| Column  | Type   | Required | Description |
|---------|--------|----------|-------------|
| name    | string | Yes      | Customer name (min 2 chars) |
| email   | string | Yes      | Valid email address (unique) |
| balance | number | No       | Account balance (defaults to 0) |

### Sample XLSX Structure

```
| name              | email                   | balance |
|-------------------|-------------------------|---------|
| Ada Lovelace      | ada@c33.io              | 1200    |
| Alan Turing       | alan@c33.io             | 1500    |
| Grace Hopper      | grace@c33.io            | 1800    |
```

### Column Name Variations

The parser accepts these column name variations:
- `name`, `Name`, `NAME`, `customer_name`, `CustomerName`
- `email`, `Email`, `EMAIL`, `customer_email`, `CustomerEmail`
- `balance`, `Balance`, `BALANCE`

### Sheet Selection

- Looks for sheet named "Customers" first
- Falls back to first sheet if "Customers" not found

---

## Error Handling Examples

### Validation Error (Multiple Fields)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name must be at least 2 characters long"
    },
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### MongoDB Connection Error

```json
{
  "statusCode": 500,
  "message": "Database operation failed",
  "error": "Internal Server Error"
}
```

### Job Processing Error

Stored in job document's `error` field:
```json
{
  "error": "Failed to parse XLSX file: File not found"
}
```
