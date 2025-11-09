import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import helmet from 'helmet';

async function bootstrap() {
  console.log('[DEBUG] Starting bootstrap...');
  const app = await NestFactory.create(AppModule);
  console.log('[DEBUG] NestFactory.create completed');

  // Security middleware
  console.log('[DEBUG] Configuring security middleware...');
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  console.log(`[DEBUG] Port configured: ${port}`);

  // Note: We use JoiValidationPipe per-endpoint instead of global ValidationPipe
  // This is because we're using Joi schemas for validation, not class-validator decorators
  console.log(
    '[DEBUG] Skipping global pipes (using Joi validation per-endpoint)',
  );

  // Global filters (order matters: specific to general)
  console.log('[DEBUG] Setting up global filters...');
  app.useGlobalFilters(new MongoExceptionFilter(), new AllExceptionsFilter());

  // Global interceptors
  console.log('[DEBUG] Setting up global interceptors...');
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger OpenAPI configuration
  console.log('[DEBUG] Setting up Swagger...');
  const config = new DocumentBuilder()
    .setTitle('Capital 33 Backend API')
    .setDescription(
      'Production-grade API for Capital 33 fintech platform - manages customers, background jobs, and XLSX imports',
    )
    .setVersion('1.0')
    .addTag('Customers', 'Customer CRUD operations')
    .addTag('Queue', 'Background job queue management')
    .addTag('Imports', 'XLSX file import operations')
    .build();

  console.log('[DEBUG] Creating Swagger document...');
  const document = SwaggerModule.createDocument(app, config);
  console.log('[DEBUG] Setting up Swagger UI...');
  SwaggerModule.setup('docs', app, document);

  console.log('[DEBUG] Starting listener on port', port);
  await app.listen(port);
  console.log(`🚀 Application running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await app.close();
    process.exit(0);
  });
}

void bootstrap();
