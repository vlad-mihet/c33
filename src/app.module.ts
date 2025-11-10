import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { AppError } from './common/errors/app-error';
import { ErrorCodes } from './common/errors/error-codes';
import configuration, { configValidationSchema } from './config/configuration';
import { CustomerModule } from './customer/customer.module';
import { ImportModule } from './import/import.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    // Config module with Joi validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('mongodb.uri');
        if (!uri) {
          throw new AppError(
            ErrorCodes.CONFIG_MONGODB_URI_MISSING,
            500,
            'Configuration Error',
            'MONGODB_URI environment variable is required',
          );
        }
        return {
          uri,
          retryWrites: true,
          w: 'majority',
          readPreference: 'primary',
          connectTimeoutMS: 10000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          maxPoolSize: 10,
        };
      },
      inject: [ConfigService],
    }),

    // Schedule module for queue worker
    ScheduleModule.forRoot(),

    // Feature modules
    CustomerModule,
    QueueModule,
    ImportModule,
  ],
  controllers: [],
  providers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS requires class for @Module decorator
export class AppModule {}
