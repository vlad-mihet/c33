import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks (calls onModuleDestroy)
  app.enableShutdownHooks();

  // API versioning
  app.setGlobalPrefix('api/v1');

  // Security middleware
  app.use(helmet());
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
  });

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('Capital 33 Backend API')
    .setDescription(
      'Capital 33 fintech platform - customers, background jobs, XLSX imports',
    )
    .setVersion('1.0')
    .addTag('Customers', 'Customer CRUD operations')
    .addTag('Queue', 'Background job queue management')
    .addTag('Imports', 'XLSX file import operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 Application running on: http://localhost:${String(port)}`);
  // eslint-disable-next-line no-console
  console.log(
    `📚 Swagger documentation: http://localhost:${String(port)}/docs`,
  );

  // Graceful shutdown
  process.on('SIGTERM', () => {
    void (async (): Promise<void> => {
      // eslint-disable-next-line no-console
      console.log('SIGTERM received, closing server...');
      await app.close();
      process.exit(0);
    })();
  });
}

void bootstrap();
