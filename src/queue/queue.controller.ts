import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { ObjectIdValidationPipe } from '../common/pipes/objectid-validation.pipe';

import { JobStatus } from './queue.constants';
import { QueueService } from './queue.service';
import type { EnqueueJobDto } from './queue.service';
import type { JobDocument } from './schemas/job.schema';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('enqueue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enqueue a new background job' })
  @ApiBody({
    description: 'Job enqueue payload',
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          example: 'import.xlsx.customers',
          description: 'Job type identifier',
        },
        payload: {
          type: 'object',
          example: { filename: 'customers.sample.xlsx' },
          description: 'Job-specific payload data',
        },
        maxAttempts: {
          type: 'number',
          default: 3,
          description: 'Maximum retry attempts',
        },
      },
      required: ['type', 'payload'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Job enqueued successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        type: 'import.xlsx.customers',
        status: 'queued',
        payload: { filename: 'customers.sample.xlsx' },
        attempts: 0,
        maxAttempts: 3,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid job data' })
  async enqueue(
    @Body('type') type: string,
    @Body('payload') payload: Record<string, unknown>,
    @Body('maxAttempts') maxAttempts?: number,
  ): Promise<JobDocument> {
    const dto: EnqueueJobDto = { type, payload };
    if (maxAttempts !== undefined) dto.maxAttempts = maxAttempts;
    return this.queueService.enqueue(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job status and result by ID' })
  @ApiParam({
    name: 'id',
    description: 'Job ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Job found',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId',
  })
  async getJob(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<JobDocument> {
    return this.queueService.getJobById(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all jobs with optional filters' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: JobStatus,
    description: 'Filter by job status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    type: String,
    description: 'Filter by job type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of jobs to return (default: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
  })
  async getJobs(
    @Query('status') status?: JobStatus,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
  ): Promise<JobDocument[]> {
    return this.queueService.getJobs(status, type, limit);
  }
}
