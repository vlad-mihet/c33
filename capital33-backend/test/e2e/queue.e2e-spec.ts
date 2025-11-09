import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { QueueModule } from '../../src/queue/queue.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';

describe('QueueController (e2e)', () => {
  let app: INestApplication;
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('/queue/enqueue (POST)', () => {
    it('should enqueue a new job', () => {
      return request(app.getHttpServer())
        .post('/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body.type).toBe('test.job');
          expect(res.body.status).toBe('queued');
          expect(res.body.payload).toEqual({ data: 'test' });
          expect(res.body.attempts).toBe(0);
          expect(res.body.maxAttempts).toBe(3);
        });
    });

    it('should accept custom maxAttempts', () => {
      return request(app.getHttpServer())
        .post('/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test' },
          maxAttempts: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.maxAttempts).toBe(5);
        });
    });
  });

  describe('/queue/:id (GET)', () => {
    it('should return a job by id', async () => {
      // Create a job first
      const createResponse = await request(app.getHttpServer())
        .post('/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test' },
        });

      const jobId = createResponse.body._id;

      // Get the job
      const response = await request(app.getHttpServer())
        .get(`/queue/${jobId}`)
        .expect(200);

      expect(response.body._id).toBe(jobId);
      expect(response.body.type).toBe('test.job');
    });

    it('should return 404 for non-existent job', () => {
      return request(app.getHttpServer())
        .get('/queue/507f1f77bcf86cd799439011')
        .expect(404);
    });
  });

  describe('/queue (GET)', () => {
    it('should return all jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/queue')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter jobs by status', async () => {
      // Create a queued job
      await request(app.getHttpServer())
        .post('/queue/enqueue')
        .send({
          type: 'test.job',
          payload: { data: 'test' },
        });

      const response = await request(app.getHttpServer())
        .get('/queue?status=queued')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every((job) => job.status === 'queued')).toBe(true);
    });

    it('should filter jobs by type', async () => {
      // Create a specific type job
      await request(app.getHttpServer())
        .post('/queue/enqueue')
        .send({
          type: 'specific.type',
          payload: { data: 'test' },
        });

      const response = await request(app.getHttpServer())
        .get('/queue?type=specific.type')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every((job) => job.type === 'specific.type')).toBe(
        true,
      );
    });
  });
});
