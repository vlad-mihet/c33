import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  QUEUE_POLL_MS: Joi.number().default(5000),
  QUEUE_MAX_ATTEMPTS: Joi.number().default(3),
  QUEUE_STUCK_THRESHOLD_MS: Joi.number().default(300000), // 5 minutes
  IMPORT_DATA_DIR: Joi.string().default('./data'),
});

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.APP_PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  queue: {
    pollMs: parseInt(process.env.QUEUE_POLL_MS || '5000', 10),
    maxAttempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
    stuckThresholdMs: parseInt(
      process.env.QUEUE_STUCK_THRESHOLD_MS || '300000',
      10,
    ),
  },
  import: {
    dataDir: process.env.IMPORT_DATA_DIR || './data',
  },
});
