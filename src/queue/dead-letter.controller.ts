import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { ObjectIdValidationPipe } from '../common/pipes/objectid-validation.pipe';

import { DeadLetterService } from './dead-letter.service';
import type { DeadLetterJobDocument } from './schemas/dead-letter-job.schema';

@ApiTags('Dead Letter Queue')
@Controller('dlq')
export class DeadLetterController {
  constructor(private readonly dlqService: DeadLetterService) {}

  @Get()
  @ApiOperation({ summary: 'Get all DLQ jobs' })
  @ApiResponse({ status: 200, description: 'List of DLQ jobs' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by job type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of jobs to return',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of jobs to skip',
    type: Number,
  })
  async getDlqJobs(
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    jobs: DeadLetterJobDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.dlqService.getDlqJobs(type, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a DLQ job by ID' })
  @ApiResponse({ status: 200, description: 'DLQ job found' })
  @ApiResponse({ status: 400, description: 'Invalid ObjectId' })
  @ApiResponse({ status: 404, description: 'DLQ job not found' })
  async getDlqJobById(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<DeadLetterJobDocument> {
    return this.dlqService.getDlqJobById(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a DLQ job' })
  @ApiResponse({
    status: 200,
    description: 'DLQ job retried successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid ObjectId' })
  @ApiResponse({ status: 404, description: 'DLQ job not found' })
  async retryDlqJob(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<{ dlqJob: DeadLetterJobDocument; newJobId: string }> {
    return this.dlqService.retryDlqJob(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a DLQ job' })
  @ApiResponse({ status: 204, description: 'DLQ job deleted' })
  @ApiResponse({ status: 400, description: 'Invalid ObjectId' })
  @ApiResponse({ status: 404, description: 'DLQ job not found' })
  async deleteDlqJob(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<void> {
    await this.dlqService.deleteDlqJob(id);
  }
}
