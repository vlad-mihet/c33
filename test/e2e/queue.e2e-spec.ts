import type { Server } from 'http';

import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import configuration from '../../src/config/configuration';
import { QueueModule } from '../../src/queue/queue.module';

// Response types for better type safety
interface JobResponse {
  _id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
}

describe('QueueController (e2e)', () => {
  let app: INestApplication<Server>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        QueueModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('/queue/enqueue (POST)', () => {
    it('should enqueue a new job', () => {
      return request(app.getHttpServer())
        .post('/api/v1/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test' },
        })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as JobResponse;
          expect(body).toHaveProperty('_id');
          expect(body.type).toBe('test.job');
          expect(body.status).toBe('queued');
          expect(body.payload).toEqual({ data: 'test' });
          expect(body.attempts).toBe(0);
          expect(body.maxAttempts).toBe(3);
        });
    });

    it('should accept custom maxAttempts', () => {
      return request(app.getHttpServer())
        .post('/api/v1/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test-with-custom-max-attempts' },
          maxAttempts: 5,
        })
        .expect(201)
        .expect((res: request.Response) => {
          const body = res.body as JobResponse;
          expect(body.maxAttempts).toBe(5);
        });
    });
  });

  describe('/queue/:id (GET)', () => {
    it('should return a job by id', async () => {
      // Create a job first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test-get-by-id' },
        });

      const createBody = createResponse.body as JobResponse;
      const jobId = createBody._id;

      // Get the job
      const response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${jobId}`)
        .expect(200);

      const body = response.body as JobResponse;
      expect(body._id).toBe(jobId);
      expect(body.type).toBe('test.job');
    });

    it('should return 404 for non-existent job', () => {
      return request(app.getHttpServer())
        .get('/api/v1/queue/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('/queue (GET)', () => {
    it('should return all jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/queue')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter jobs by status', async () => {
      // Create a queued job
      await request(app.getHttpServer())
        .post('/api/v1/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test-filter-by-status' },
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue?status=queued')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        (response.body as Array<{ status: string }>).every(
          (job: { status: string }) => job.status === 'queued',
        ),
      ).toBe(true);
    });

    it('should filter jobs by type', async () => {
      // Create a specific type job
      await request(app.getHttpServer())
        .post('/api/v1/queue/enqueue')
        .send({
          type: 'specific.type',
          payload: { data: 'test-filter-by-type' },
        });

      const response = await request(app.getHttpServer())
        .get('/api/v1/queue?type=specific.type')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        (response.body as Array<{ type: string }>).every(
          (job: { type: string }) => job.type === 'specific.type',
        ),
      ).toBe(true);
    });
  });
});
