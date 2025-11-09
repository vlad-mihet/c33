import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import configuration, { configValidationSchema } from './config/configuration';
import { CustomerModule } from './customer/customer.module';
import { QueueModule } from './queue/queue.module';
import { ImportModule } from './import/import.module';

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
          throw new Error('MONGODB_URI is required');
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
export class AppModule {}
