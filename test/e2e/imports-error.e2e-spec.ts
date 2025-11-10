import * as fs from 'fs';
import type { Server } from 'http';
import * as path from 'path';

import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Response } from 'supertest';
import request from 'supertest';

import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';
import configuration from '../../src/config/configuration';
import { ImportModule } from '../../src/import/import.module';
import { QueueModule } from '../../src/queue/queue.module';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    title?: string;
    details?: unknown;
    correlationId?: string;
  };
}

interface JobStatusResponse {
  _id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  type: string;
  result?: {
    totalRows: number;
    valid: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: Array<{ row: number; message: string; field?: string }>;
  };
}

describe('XLSX Import Error Handling (e2e)', () => {
  let app: INestApplication<Server>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    process.env['IMPORT_DATA_DIR'] = path.join(__dirname, '../fixtures/data');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        ImportModule,
        QueueModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('Invalid Type Errors', () => {
    it('should return 400 with stable error code for unknown import type', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'unknown', filename: 'test-ap.xlsx' })
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_INVALID_TYPE');
      expect(body.error.message).toContain('Unknown import type');
      expect(body.error.correlationId).toBeDefined();
    });

    it('should return 400 for missing type parameter', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ filename: 'test-ap.xlsx' })
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_INVALID_TYPE');
    });
  });

  describe('File Not Found Errors', () => {
    it('should return 404 with stable error code when file does not exist', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'non-existent-file.xlsx' })
        .expect(404);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_FILE_NOT_FOUND');
      expect(body.error.message).toContain('File not found');
      expect(body.error.correlationId).toBeDefined();
    });

    it('should return 400 for missing filename parameter', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap' })
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_MISSING_FILENAME');
    });
  });

  describe('Path Traversal Protection', () => {
    it('should return 400 for filename with parent directory traversal', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: '../../../etc/passwd.xlsx' })
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_PATH_TRAVERSAL');
      expect(body.error.message).toContain('Invalid filename');
    });

    it('should return 400 for filename with subdirectory path', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'subdir/test-ap.xlsx' })
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_PATH_TRAVERSAL');
    });
  });

  describe('Unsupported Media Type Errors', () => {
    it('should return 404 for non-existent non-.xlsx file', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'test-file.txt' })
        .expect(404);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_FILE_NOT_FOUND');
    });

    it('should return 404 for non-existent .csv file', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'test-file.csv' })
        .expect(404);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_FILE_NOT_FOUND');
    });
  });

  describe('POST /api/v1/imports/xlsx/upload - Upload Errors', () => {
    it('should return 400 for missing file in upload', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx/upload')
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('IMPORT_MISSING_FILE');
    });

    it('should reject non-.xlsx file upload', async () => {
      const testFilePath = path.join(
        __dirname,
        '../fixtures/data/test-file.txt',
      );

      // Create a test text file
      await fs.promises.writeFile(testFilePath, 'test content', 'utf-8');

      try {
        const res: Response = await request(app.getHttpServer())
          .post('/api/v1/imports/xlsx/upload')
          .attach('file', testFilePath)
          .expect(415);

        const body = res.body as ErrorResponse;
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('IMPORT_UNSUPPORTED_MEDIA_TYPE');
      } finally {
        await fs.promises.unlink(testFilePath);
      }
    });
  });

  describe('Invalid Row Data', () => {
    it('should report validation errors for invalid AP rows', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'test-ap-invalid.xlsx' })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.status).toBe('succeeded');
      expect(job.result?.failed).toBeGreaterThan(0);
      expect(job.result?.errors).toBeDefined();
      expect(job.result?.errors.length).toBeGreaterThan(0);

      const firstError = job.result?.errors[0];
      expect(firstError?.row).toBeGreaterThan(0);
      expect(firstError?.message).toBeDefined();
    });

    it('should report currency validation errors', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'test-ap-bad-currency.xlsx' })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.result?.failed).toBeGreaterThan(0);

      const currencyError = job.result?.errors.find((err) =>
        err.message.toLowerCase().includes('currency'),
      );
      expect(currencyError).toBeDefined();
    });

    it('should report status enum validation errors', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({ type: 'ap', filename: 'test-ap-bad-status.xlsx' })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.result?.failed).toBeGreaterThan(0);

      const statusError = job.result?.errors.find((err) =>
        err.message.toLowerCase().includes('status'),
      );
      expect(statusError).toBeDefined();
    });
  });

  describe('Budget Forecast Composite Key Validation', () => {
    it('should handle duplicate composite keys in same file', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'budgetForecast',
          filename: 'test-budget-forecast-duplicates.xlsx',
        })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.status).toBe('succeeded');
    });

    it('should validate fiscalYear range', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'budgetForecast',
          filename: 'test-budget-forecast-bad-year.xlsx',
        })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.result?.failed).toBeGreaterThan(0);

      const yearError = job.result?.errors.find((err) =>
        err.message.toLowerCase().includes('fiscalyear'),
      );
      expect(yearError).toBeDefined();
    });

    it('should validate quarter range (1-4)', async () => {
      const res: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'budgetForecast',
          filename: 'test-budget-forecast-bad-quarter.xlsx',
        })
        .expect(202);

      await waitForJobCompletion(app, res.body.jobId as string);

      const jobRes: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${res.body.jobId as string}`)
        .expect(200);

      const job = jobRes.body as JobStatusResponse;
      expect(job.result?.failed).toBeGreaterThan(0);

      const quarterError = job.result?.errors.find((err) =>
        err.message.toLowerCase().includes('quarter'),
      );
      expect(quarterError).toBeDefined();
    });
  });

  describe('Queue Error Handling', () => {
    it('should return 400 for invalid job ID', async () => {
      const res: Response = await request(app.getHttpServer())
        .get('/api/v1/queue/invalid-id')
        .expect(400);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_INVALID_OBJECTID');
    });

    it('should return 404 for non-existent job ID', async () => {
      const res: Response = await request(app.getHttpServer())
        .get('/api/v1/queue/507f1f77bcf86cd799439011')
        .expect(404);

      const body = res.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('QUEUE_JOB_NOT_FOUND');
    });
  });
});

async function waitForJobCompletion(
  app: INestApplication<Server>,
  jobId: string,
  maxAttempts = 30,
  intervalMs = 500,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res: Response = await request(app.getHttpServer()).get(
      `/api/v1/queue/${jobId}`,
    );

    const body = res.body as JobStatusResponse;

    if (body.status === 'succeeded' || body.status === 'failed') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Job ${jobId} did not complete within timeout`);
}
