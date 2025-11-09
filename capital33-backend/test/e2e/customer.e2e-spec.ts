import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { CustomerModule } from '../../src/customer/customer.module';
import { MongoExceptionFilter } from '../../src/common/filters/mongo-exception.filter';

describe('CustomerController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), CustomerModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new MongoExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('/customers (POST)', () => {
    it('should create a new customer', () => {
      return request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Ada Lovelace',
          email: 'ada@c33.io',
          balance: 1200,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body.name).toBe('Ada Lovelace');
          expect(res.body.email).toBe('ada@c33.io');
          expect(res.body.balance).toBe(1200);
        });
    });

    it('should reject duplicate email', async () => {
      // Create first customer
      await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Test User',
          email: 'duplicate@c33.io',
          balance: 100,
        })
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Another User',
          email: 'duplicate@c33.io',
          balance: 200,
        })
        .expect(409);
    });

    it('should reject invalid data', () => {
      return request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'A', // Too short
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('/customers (GET)', () => {
    it('should return paginated customers', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/customers?name=Ada')
        .expect(200);

      expect(response.body.data.every((c) => c.name.includes('Ada'))).toBe(
        true,
      );
    });
  });

  describe('/customers/:id (GET)', () => {
    it('should return a customer by id', async () => {
      // Create a customer first
      const createResponse = await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Test Customer',
          email: 'test-get@c33.io',
          balance: 500,
        });

      const customerId = createResponse.body._id;

      // Get the customer
      const response = await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .expect(200);

      expect(response.body._id).toBe(customerId);
      expect(response.body.name).toBe('Test Customer');
    });

    it('should return 404 for non-existent id', () => {
      return request(app.getHttpServer())
        .get('/customers/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('/customers/:id (PATCH)', () => {
    it('should update a customer', async () => {
      // Create a customer first
      const createResponse = await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'Original Name',
          email: 'update-test@c33.io',
          balance: 100,
        });

      const customerId = createResponse.body._id;

      // Update the customer
      const response = await request(app.getHttpServer())
        .patch(`/customers/${customerId}`)
        .send({
          name: 'Updated Name',
          balance: 200,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.balance).toBe(200);
      expect(response.body.email).toBe('update-test@c33.io'); // Unchanged
    });
  });

  describe('/customers/:id (DELETE)', () => {
    it('should delete a customer', async () => {
      // Create a customer first
      const createResponse = await request(app.getHttpServer())
        .post('/customers')
        .send({
          name: 'To Delete',
          email: 'delete-test@c33.io',
          balance: 100,
        });

      const customerId = createResponse.body._id;

      // Delete the customer
      await request(app.getHttpServer())
        .delete(`/customers/${customerId}`)
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/customers/${customerId}`)
        .expect(404);
    });
  });
});
