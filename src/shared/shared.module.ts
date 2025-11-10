import { Module } from '@nestjs/common';

import { XlsxService } from '../import/xlsx.service';

/**
 * SharedModule - Contains utilities shared across multiple feature modules
 * Created to break circular dependency between ImportModule and QueueModule
 */
@Module({
  providers: [XlsxService],
  exports: [XlsxService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS requires class for @Module decorator
export class SharedModule {}
