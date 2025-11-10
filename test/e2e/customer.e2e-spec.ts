import type { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import { CustomerModule } from '../../src/customer/customer.module';

interface CustomerResponse {
  _id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  items: CustomerResponse[];
  meta: PaginationMeta;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
// External test library types are complex; focus on production code type safety

describe('CustomerController (e2e) - Production Grade', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let httpServer: ReturnType<typeof request>;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), CustomerModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add API versioning
    app.setGlobalPrefix('api/v1');

    // Apply global filters (order matters)
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();

    httpServer = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /api/v1/customers', () => {
    it('should create a customer with proper normalization', async () => {
      const res = await httpServer
        .post('/api/v1/customers')
        .send({
          name: '  Ada   Lovelace  ', // Extra whitespace
          email: '  ADA@C33.IO  ', // Mixed case with whitespace
          balance: 1200,
        })
        .expect(201);

      const body = res.body as ApiSuccessResponse<CustomerResponse>;

      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('_id');
      expect(body.data.name).toBe('Ada Lovelace'); // Normalized
      expect(body.data.email).toBe('ada@c33.io'); // Lowercased by Joi
      expect(body.data.balance).toBe(1200);
      expect(body.data.__v).toBe(0);

      // Check ETag header
      expect(res.headers['etag']).toMatch(/^W\/"[a-f0-9]{24}:0"$/);
    });

    it('should reject duplicate email (case-insensitive)', async () => {
      // Create first customer
      await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'Test User',
          email: 'duplicate@c33.io',
          balance: 100,
        })
        .expect(201);

      // Try duplicate with different case
      await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'Another User',
          email: '  DUPLICATE@C33.IO  ', // Different case + whitespace
          balance: 200,
        })
        .expect(409);
    });

    it('should reject invalid data (name too short)', async () => {
      await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'A', // Too short
          email: 'short@c33.io',
        })
        .expect(400);
    });

    it('should reject invalid email format', async () => {
      await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'Valid Name',
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should reject negative balance', async () => {
      await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'Valid Name',
          email: 'negative@c33.io',
          balance: -100,
        })
        .expect(400);
    });

    it('should coerce string balance to number', async () => {
      const res = await httpServer
        .post('/api/v1/customers')
        .send({
          name: 'Coerce Test',
          email: 'coerce@c33.io',
          balance: '500', // String instead of number
        })
        .expect(201);

      const body = res.body as ApiSuccessResponse<CustomerResponse>;
      expect(body.data.balance).toBe(500);
      expect(typeof body.data.balance).toBe('number');
    });
  });

  describe('GET /api/v1/customers', () => {
    beforeAll(async () => {
      // Seed test data
      const testCustomers = [
        { name: 'Alice Anderson', email: 'alice@c33.io', balance: 1000 },
        { name: 'Bob Builder', email: 'bob@c33.io', balance: 2000 },
        { name: 'Charlie Chan', email: 'charlie@c33.io', balance: 500 },
        { name: 'Diana Prince', email: 'diana@c33.io', balance: 3000 },
      ];

      for (const customer of testCustomers) {
        await httpServer.post('/api/v1/customers').send(customer);
      }
    });

    it('should return paginated customers with default params', async () => {
      const res = await httpServer.get('/api/v1/customers').expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.success).toBe(true);
      expect(body.data.items).toBeInstanceOf(Array);
      expect(body.data.meta).toEqual({
        page: 1,
        pageSize: 20,
        total: expect.any(Number) as number,
        totalPages: expect.any(Number) as number,
      });
    });

    it('should support pagination parameters', async () => {
      const res = await httpServer
        .get('/api/v1/customers?page=1&pageSize=2')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.data.items.length).toBeLessThanOrEqual(2);
      expect(body.data.meta.page).toBe(1);
      expect(body.data.meta.pageSize).toBe(2);
    });

    it('should reject pageSize > 100', async () => {
      await httpServer.get('/api/v1/customers?pageSize=500').expect(400);
    });

    it('should return empty items for non-existent page', async () => {
      const res = await httpServer
        .get('/api/v1/customers?page=999')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.data.items).toHaveLength(0);
      expect(body.data.meta.page).toBe(999);
      expect(body.data.meta.total).toBeGreaterThan(0);
    });

    it('should search across name and email (case-insensitive)', async () => {
      const res = await httpServer.get('/api/v1/customers?q=alice').expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.data.items.length).toBeGreaterThan(0);
      expect(
        body.data.items.some(
          (c) =>
            c.name.toLowerCase().includes('alice') ||
            c.email.toLowerCase().includes('alice'),
        ),
      ).toBe(true);
    });

    it('should escape special regex characters in search', async () => {
      // This should not crash the server
      await httpServer.get('/api/v1/customers?q=.*[]()+?').expect(200);
    });

    it('should filter by minBalance', async () => {
      const res = await httpServer
        .get('/api/v1/customers?minBalance=2000')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.data.items.every((c) => c.balance >= 2000)).toBe(true);
    });

    it('should filter by maxBalance', async () => {
      const res = await httpServer
        .get('/api/v1/customers?maxBalance=1000')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(body.data.items.every((c) => c.balance <= 1000)).toBe(true);
    });

    it('should filter by balance range', async () => {
      const res = await httpServer
        .get('/api/v1/customers?minBalance=500&maxBalance=2000')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      expect(
        body.data.items.every((c) => c.balance >= 500 && c.balance <= 2000),
      ).toBe(true);
    });

    it('should reject invalid balance range (min > max)', async () => {
      await httpServer
        .get('/api/v1/customers?minBalance=2000&maxBalance=1000')
        .expect(400);
    });

    it('should sort by balance descending', async () => {
      const res = await httpServer
        .get('/api/v1/customers?sort=-balance')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      // Verify descending sort - array access is safe within bounds check
      if (body.data.items.length > 1) {
        for (let i = 1; i < body.data.items.length; i++) {
          const a = body.data.items[i - 1]?.balance;
          const b = body.data.items[i]?.balance;

          if (typeof a === 'number' && typeof b === 'number') {
            expect(a).toBeGreaterThanOrEqual(b);
          }
        }
      }
    });

    it('should sort by name ascending', async () => {
      const res = await httpServer
        .get('/api/v1/customers?sort=name')
        .expect(200);

      const body = res.body as ApiSuccessResponse<ListResponse>;

      // Verify ascending sort - array access is safe within bounds check
      if (body.data.items.length > 1) {
        for (let i = 1; i < body.data.items.length; i++) {
          const a = body.data.items[i - 1]?.name;
          const b = body.data.items[i]?.name;

          if (typeof a === 'string' && typeof b === 'string') {
            expect(a.localeCompare(b)).toBeLessThanOrEqual(0);
          }
        }
      }
    });

    it('should reject invalid sort field', async () => {
      await httpServer.get('/api/v1/customers?sort=invalid').expect(400);
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('should return customer by id with ETag', async () => {
      // Create customer
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'Test Customer',
        email: 'test-get@c33.io',
        balance: 500,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;

      // Get customer
      const res = await httpServer
        .get(`/api/v1/customers/${customerId}`)
        .expect(200);

      const body = res.body as ApiSuccessResponse<CustomerResponse>;

      expect(body.success).toBe(true);
      expect(body.data._id).toBe(customerId);
      expect(body.data.name).toBe('Test Customer');

      // Check ETag
      expect(res.headers['etag']).toMatch(/^W\/"[a-f0-9]{24}:\d+"$/);
    });

    it('should return 404 for non-existent id', async () => {
      await httpServer
        .get('/api/v1/customers/507f1f77bcf86cd799439011')
        .expect(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      await httpServer.get('/api/v1/customers/invalid-id').expect(400);
    });
  });

  describe('PATCH /api/v1/customers/:id', () => {
    it('should update customer fields', async () => {
      // Create customer
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'Original Name',
        email: 'update-test@c33.io',
        balance: 100,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;

      // Update customer
      const res = await httpServer
        .patch(`/api/v1/customers/${customerId}`)
        .send({
          name: 'Updated Name',
          balance: 200,
        })
        .expect(200);

      const body = res.body as ApiSuccessResponse<CustomerResponse>;

      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Name');
      expect(body.data.balance).toBe(200);
      expect(body.data.email).toBe('update-test@c33.io'); // Unchanged
      expect(body.data.__v).toBe(1); // Version incremented

      // Check ETag
      expect(res.headers['etag']).toMatch(/^W\/"[a-f0-9]{24}:1"$/);
    });

    it('should support optimistic concurrency with If-Match', async () => {
      // Create customer
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'Concurrency Test',
        email: 'concurrency@c33.io',
        balance: 1000,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;
      const etag = createRes.headers['etag'] ?? '';

      // Update with correct ETag
      const res = await httpServer
        .patch(`/api/v1/customers/${customerId}`)
        .set('If-Match', etag)
        .send({
          balance: 1100,
        })
        .expect(200);

      const body = res.body as ApiSuccessResponse<CustomerResponse>;
      expect(body.data.balance).toBe(1100);
      expect(body.data.__v).toBe(1);
    });

    it('should return 412 for If-Match version mismatch', async () => {
      // Create customer
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'Conflict Test',
        email: 'conflict@c33.io',
        balance: 1000,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;

      // Update once
      await httpServer
        .patch(`/api/v1/customers/${customerId}`)
        .send({
          balance: 1100,
        })
        .expect(200);

      // Try to update with old version (0, but current is 1)
      await httpServer
        .patch(`/api/v1/customers/${customerId}`)
        .set('If-Match', `W/"${customerId}:0"`)
        .send({
          balance: 1200,
        })
        .expect(412);
    });

    it('should reject update email to existing customer email', async () => {
      // Create two customers
      await httpServer.post('/api/v1/customers').send({
        name: 'User 1',
        email: 'user1@c33.io',
        balance: 100,
      });

      const createRes2 = await httpServer.post('/api/v1/customers').send({
        name: 'User 2',
        email: 'user2@c33.io',
        balance: 200,
      });

      const createBody2 =
        createRes2.body as ApiSuccessResponse<CustomerResponse>;
      const user2Id = createBody2.data._id;

      // Try to update user2's email to user1's email
      await httpServer
        .patch(`/api/v1/customers/${user2Id}`)
        .send({
          email: '  USER1@C33.IO  ', // Different case + whitespace
        })
        .expect(409);
    });

    it('should reject empty update payload', async () => {
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'Empty Update Test',
        email: 'empty-update@c33.io',
        balance: 100,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;

      await httpServer
        .patch(`/api/v1/customers/${customerId}`)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent customer', async () => {
      await httpServer
        .patch('/api/v1/customers/507f1f77bcf86cd799439011')
        .send({
          name: 'New Name',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/customers/:id', () => {
    it('should delete customer', async () => {
      // Create customer
      const createRes = await httpServer.post('/api/v1/customers').send({
        name: 'To Delete',
        email: 'delete-test@c33.io',
        balance: 100,
      });

      const createBody = createRes.body as ApiSuccessResponse<CustomerResponse>;
      const customerId = createBody.data._id;

      // Delete customer
      const res = await httpServer
        .delete(`/api/v1/customers/${customerId}`)
        .expect(200);

      const body = res.body as ApiSuccessResponse<{ id: string }>;

      expect(body.success).toBe(true);
      expect(body.data.id).toBe(customerId);

      // Verify deleted
      await httpServer.get(`/api/v1/customers/${customerId}`).expect(404);
    });

    it('should return 404 when deleting non-existent customer', async () => {
      await httpServer
        .delete('/api/v1/customers/507f1f77bcf86cd799439011')
        .expect(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      await httpServer.delete('/api/v1/customers/invalid-id').expect(400);
    });
  });
});
