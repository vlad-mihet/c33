import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import configuration from '../src/config/configuration';
import { ImportModule } from '../src/import/import.module';
import { QueueModule } from '../src/queue/queue.module';
import { CustomerModule } from '../src/customer/customer.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { MongoExceptionFilter } from '../src/common/filters/mongo-exception.filter';
import * as path from 'path';
import * as fs from 'fs';

describe('ImportsController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    // Set up test data directory
    process.env.IMPORT_DATA_DIR = path.join(process.cwd(), 'data');

    // Verify test files exist
    const testFiles = [
      'Accounts-Payable.xlsx',
      'Accounts-Receivable.xlsx',
      'General-Ledger.xlsx',
      'Expense-Claims.xlsx',
      'Budget-Forecast.xlsx',
    ];

    for (const file of testFiles) {
      const filePath = path.join(process.env.IMPORT_DATA_DIR, file);
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
    app.useGlobalFilters(
      new MongoExceptionFilter(),
      new AllExceptionsFilter(),
    );

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
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('type', 'ap');
      expect(response.body.message).toBe('Import job enqueued successfully');

      // Wait for job to complete
      await waitForJobCompletion(app, response.body.jobId);

      // Verify job succeeded
      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
      expect(jobResponse.body.result).toHaveProperty('totalRows');
      expect(jobResponse.body.result).toHaveProperty('inserted');
      expect(jobResponse.body.result).toHaveProperty('updated');
      expect(jobResponse.body.result.totalRows).toBeGreaterThan(0);
    });

    it('should enqueue Accounts Receivable import job', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ar',
          filename: 'Accounts-Receivable.xlsx',
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'queued');

      await waitForJobCompletion(app, response.body.jobId);

      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
    });

    it('should enqueue General Ledger import job', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'gl',
          filename: 'General-Ledger.xlsx',
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      await waitForJobCompletion(app, response.body.jobId);

      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
    });

    it('should enqueue Expense Claims import job', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'expenseClaims',
          filename: 'Expense-Claims.xlsx',
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      await waitForJobCompletion(app, response.body.jobId);

      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
    });

    it('should enqueue Budget Forecast import job', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'budgetForecast',
          filename: 'Budget-Forecast.xlsx',
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      await waitForJobCompletion(app, response.body.jobId);

      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
    });

    it('should return 400 for invalid import type', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'invalid',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(400);

      expect(response.body.message).toContain('Unknown import type');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'NonExistent.xlsx',
        })
        .expect(404);

      expect(response.body.message).toContain('File not found');
    });

    it('should return 400 for missing type', async () => {
      await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(400);
    });

    it('should return 400 for missing filename', async () => {
      await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ap',
        })
        .expect(400);
    });
  });

  describe('POST /imports/xlsx/upload', () => {
    it('should upload and import file', async () => {
      const filePath = path.join(
        process.env.IMPORT_DATA_DIR!,
        'Accounts-Payable.xlsx',
      );

      const response = await request(app.getHttpServer())
        .post('/imports/xlsx/upload')
        .attach('file', filePath)
        .expect(202);

      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('status', 'queued');
      expect(response.body).toHaveProperty('originalFilename');

      await waitForJobCompletion(app, response.body.jobId);

      const jobResponse = await request(app.getHttpServer())
        .get(`/queue/${response.body.jobId}`)
        .expect(200);

      expect(jobResponse.body.status).toBe('succeeded');
    });

    it('should return 400 for missing file', async () => {
      await request(app.getHttpServer())
        .post('/imports/xlsx/upload')
        .expect(400);
    });
  });

  describe('Idempotency', () => {
    it('should handle re-imports by updating existing records', async () => {
      // First import
      const response1 = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(202);

      await waitForJobCompletion(app, response1.body.jobId);

      const job1Response = await request(app.getHttpServer())
        .get(`/queue/${response1.body.jobId}`)
        .expect(200);

      // const firstInserted = job1Response.body.result.inserted;

      // Second import (should update)
      const response2 = await request(app.getHttpServer())
        .post('/imports/xlsx')
        .send({
          type: 'ap',
          filename: 'Accounts-Payable.xlsx',
        })
        .expect(202);

      await waitForJobCompletion(app, response2.body.jobId);

      const job2Response = await request(app.getHttpServer())
        .get(`/queue/${response2.body.jobId}`)
        .expect(200);

      // Second run should have 0 inserts (all updates)
      expect(job2Response.body.result.inserted).toBe(0);
      expect(job2Response.body.result.updated).toBeGreaterThan(0);
    });
  });
});

// Helper function to wait for job completion
async function waitForJobCompletion(
  app: INestApplication,
  jobId: string,
  maxAttempts = 30,
  intervalMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await request(app.getHttpServer()).get(`/queue/${jobId}`);

    if (
      response.body.status === 'succeeded' ||
      response.body.status === 'failed'
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Job ${jobId} did not complete within timeout`);
}
