import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  QUEUE_CONCURRENCY: Joi.number().integer().min(1).default(4),
  QUEUE_IDLE_MS: Joi.number().integer().min(100).default(750),
  QUEUE_VISIBILITY_MS: Joi.number().integer().min(1000).default(30000),
  QUEUE_HEARTBEAT_MS: Joi.number().integer().min(500).default(10000),
  QUEUE_BACKOFF_BASE_MS: Joi.number().integer().min(100).default(1000),
  QUEUE_BACKOFF_FACTOR: Joi.number().min(1).default(2),
  QUEUE_BACKOFF_MAX_MS: Joi.number().integer().min(1000).default(60000),
  QUEUE_MAX_ATTEMPTS: Joi.number().integer().min(1).default(5),
  QUEUE_DLQ_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  IMPORT_DATA_DIR: Joi.string().default('./data'),
});

export default (): {
  nodeEnv: string;
  port: number;
  mongodb: { uri: string | undefined };
  queue: {
    concurrency: number;
    idleMs: number;
    visibilityMs: number;
    heartbeatMs: number;
    backoffBaseMs: number;
    backoffFactor: number;
    backoffMaxMs: number;
    maxAttempts: number;
    dlqRetentionDays: number;
  };
  import: { dataDir: string };
} => ({
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['APP_PORT'] || '3000', 10),
  mongodb: {
    uri: process.env['MONGODB_URI'],
  },
  queue: {
    concurrency: parseInt(process.env['QUEUE_CONCURRENCY'] || '4', 10),
    idleMs: parseInt(process.env['QUEUE_IDLE_MS'] || '750', 10),
    visibilityMs: parseInt(process.env['QUEUE_VISIBILITY_MS'] || '30000', 10),
    heartbeatMs: parseInt(process.env['QUEUE_HEARTBEAT_MS'] || '10000', 10),
    backoffBaseMs: parseInt(process.env['QUEUE_BACKOFF_BASE_MS'] || '1000', 10),
    backoffFactor: parseFloat(process.env['QUEUE_BACKOFF_FACTOR'] || '2'),
    backoffMaxMs: parseInt(process.env['QUEUE_BACKOFF_MAX_MS'] || '60000', 10),
    maxAttempts: parseInt(process.env['QUEUE_MAX_ATTEMPTS'] || '5', 10),
    dlqRetentionDays: parseInt(
      process.env['QUEUE_DLQ_RETENTION_DAYS'] || '30',
      10,
    ),
  },
  import: {
    dataDir: process.env['IMPORT_DATA_DIR'] || './data',
  },
});
