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

import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import configuration from '../src/config/configuration';
import { CustomerModule } from '../src/customer/customer.module';
import { ImportModule } from '../src/import/import.module';
import { QueueModule } from '../src/queue/queue.module';

// Response types for better type safety
interface ImportJobResponse {
  jobId: string;
  status: string;
  type: string;
  message: string;
  originalFilename?: string;
}

interface JobStatusResponse {
  _id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  type: string;
  result?: {
    totalRows: number;
    inserted: number;
    updated: number;
    failed?: number;
    errors?: string[];
  };
}

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

describe('ImportsController (e2e)', () => {
  let app: INestApplication<Server>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Set up test data directory
    process.env['IMPORT_DATA_DIR'] = path.join(process.cwd(), 'data');

    // Verify test files exist
    const testFiles = [
      'Accounts-Payable.xlsx',
      'Accounts-Receivable.xlsx',
      'General-Ledger.xlsx',
      'Expense-Claims.xlsx',
      'Budget-Forecast.xlsx',
    ];

    for (const file of testFiles) {
      const filePath = path.join(process.env['IMPORT_DATA_DIR'], file);
      if (!fs.existsSync(filePath)) {
        throw new Error(
          `Test file not found: ${filePath}. Please ensure sample files are in ./data/`,
        );
      }
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        MongooseModule.forRoot(uri),
        ImportModule,
        QueueModule,
        CustomerModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global filters
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Set global prefix to match production
    app.setGlobalPrefix('api/v1');

    await app.init();

    // Give queue worker time to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  describe('POST /imports/xlsx', () => {
    it('should enqueue Accounts Payable import job', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status', 'queued');
      expect(body).toHaveProperty('type', 'ap');
      expect(body.message).toBe('Import job enqueued successfully');

      // Wait for job to complete
      await waitForJobCompletion(app, body.jobId);

      // Verify job succeeded
      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
      expect(jobBody.result).toHaveProperty('totalRows');
      expect(jobBody.result).toHaveProperty('inserted');
      expect(jobBody.result).toHaveProperty('updated');
      expect(jobBody.result?.totalRows).toBeGreaterThan(0);
    });

    it('should enqueue Accounts Receivable import job', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ar',
          filename: 'Accounts-Receivable.xlsx',
        })
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status', 'queued');

      await waitForJobCompletion(app, body.jobId);

      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
    });

    it('should enqueue General Ledger import job', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'gl',
          filename: 'General-Ledger.xlsx',
        })
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      await waitForJobCompletion(app, body.jobId);

      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
    });

    it('should enqueue Expense Claims import job', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'expenseClaims',
          filename: 'Expense-Claims.xlsx',
        })
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      await waitForJobCompletion(app, body.jobId);

      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
    });

    it('should enqueue Budget Forecast import job', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'budgetForecast',
          filename: 'Budget-Forecast.xlsx',
        })
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      await waitForJobCompletion(app, body.jobId);

      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
    });

    it('should return 400 for invalid import type', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'invalid',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(400);

      const body = response.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Unknown import type');
    });

    it('should return 404 for non-existent file', async () => {
      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'NonExistent.xlsx',
        })
        .expect(404);

      const body = response.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('File not found');
    });

    it('should return 400 for missing type', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(400);
    });

    it('should return 400 for missing filename', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ap',
        })
        .expect(400);
    });
  });

  describe('POST /imports/xlsx/upload', () => {
    it('should upload and import file', async () => {
      const dataDir = process.env['IMPORT_DATA_DIR'];
      if (!dataDir) {
        throw new Error('IMPORT_DATA_DIR not set');
      }
      const filePath = path.join(dataDir, 'Accounts-Payable.xlsx');

      const response: Response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx/upload')
        .attach('file', filePath)
        .expect(202);

      const body = response.body as ImportJobResponse;
      expect(body).toHaveProperty('jobId');
      expect(body).toHaveProperty('status', 'queued');
      expect(body).toHaveProperty('originalFilename');

      await waitForJobCompletion(app, body.jobId);

      const jobResponse: Response = await request(app.getHttpServer())
        .get(`/api/v1/queue/${body.jobId}`)
        .expect(200);

      const jobBody = jobResponse.body as JobStatusResponse;
      expect(jobBody.status).toBe('succeeded');
    });

    it('should return 400 for missing file', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx/upload')
        .expect(400);
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate imports via idempotency check', async () => {
      // All import types have already been imported in earlier tests
      // So any attempt to re-import should return 409 Conflict
      // Let's verify this by trying to re-import the AP file
      await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(409);

      // Verify the error response has the correct structure
      const response = await request(app.getHttpServer())
        .post('/api/v1/imports/xlsx')
        .send({
          type: 'ar',
          filename: 'Accounts-Receivable.xlsx',
        })
        .expect(409);

      const body = response.body as ErrorResponse;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DB_DUPLICATE_KEY');
    });
  });
});

// Helper function to wait for job completion
async function waitForJobCompletion(
  app: INestApplication<Server>,
  jobId: string,
  maxAttempts = 30,
  intervalMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response: Response = await request(app.getHttpServer()).get(
      `/api/v1/queue/${jobId}`,
    );

    const body = response.body as JobStatusResponse;

    if (body.status === 'succeeded' || body.status === 'failed') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Job ${jobId} did not complete within timeout`);
}
