import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { ObjectIdValidationPipe } from '../common/pipes/objectid-validation.pipe';
import type {
  ApiSuccessResponse,
  PaginationMeta,
} from '../common/types/api-response.type';
import { generateETag, parseETag } from '../common/utils/etag.util';
import { ok } from '../common/utils/response.util';

import { CustomerService } from './customer.service';
import { createCustomerSchema } from './dtos/create-customer.joi';
import type { CreateCustomerDto } from './dtos/create-customer.joi';
import { listCustomersQuerySchema } from './dtos/list-customers.query.joi';
import type { ListCustomersQueryDto } from './dtos/list-customers.query.joi';
import { updateCustomerSchema } from './dtos/update-customer.joi';
import type { UpdateCustomerDto } from './dtos/update-customer.joi';
import type { CustomerDocument } from './schemas/customer.schema';

interface CustomerResponse {
  _id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

@ApiTags('customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @UsePipes(new JoiValidationPipe(createCustomerSchema))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiBody({
    description: 'Customer creation payload',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 120,
          example: 'Ada Lovelace',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'ada@c33.io',
        },
        balance: { type: 'number', default: 0, minimum: 0, example: 1200 },
      },
      required: ['name', 'email'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
  })
  @ApiResponse({
    status: 409,
    description:
      'Customer with this email already exists (CUSTOMER_DUPLICATE_EMAIL)',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (VALIDATION_FAILED)',
  })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponse<CustomerResponse>> {
    const customer = await this.customerService.create(createCustomerDto);
    const etag = generateETag(customer._id.toString(), customer.__v);

    res.setHeader('ETag', etag);

    return ok(this.toCustomerResponse(customer));
  }

  @Get()
  @UsePipes(new JoiValidationPipe(listCustomersQuerySchema))
  @ApiOperation({
    summary: 'Get all customers with pagination, search, filters, and sorting',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1, min: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, min: 1, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email (case-insensitive partial match)',
    example: 'ada@c33.io',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name (case-insensitive partial match)',
    example: 'ada',
  })
  @ApiQuery({
    name: 'minBalance',
    required: false,
    type: Number,
    description: 'Minimum balance filter',
    example: 0,
  })
  @ApiQuery({
    name: 'maxBalance',
    required: false,
    type: Number,
    description: 'Maximum balance filter',
    example: 10000,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'name',
      'email',
      'balance',
      'createdAt',
      '-name',
      '-email',
      '-balance',
      '-createdAt',
    ],
    description:
      'Sort field (prefix with - for descending). Default: -createdAt',
    example: '-createdAt',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters (VALIDATION_FAILED)',
  })
  async findAll(
    @Query() query: ListCustomersQueryDto,
  ): Promise<
    ApiSuccessResponse<{ items: CustomerResponse[]; meta: PaginationMeta }>
  > {
    const { customers, meta } = await this.customerService.findAll(query);

    return ok(
      {
        items: customers.map((c) => this.toCustomerResponse(c)),
        meta,
      },
      meta as unknown as Record<string, unknown>,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID (24-character hex ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer found',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found (CUSTOMER_NOT_FOUND)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId (VALIDATION_INVALID_OBJECTID)',
  })
  async findOne(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponse<CustomerResponse>> {
    const customer = await this.customerService.findOne(id);
    const etag = generateETag(customer._id.toString(), customer.__v);

    res.setHeader('ETag', etag);

    return ok(this.toCustomerResponse(customer));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a customer (supports optimistic concurrency)',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID (24-character hex ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiHeader({
    name: 'If-Match',
    required: false,
    description: 'ETag for optimistic concurrency (format: W/"<id>:<version>")',
    example: 'W/"507f1f77bcf86cd799439011:2"',
  })
  @ApiBody({
    description:
      'Customer update payload (partial, at least one field required)',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 120,
          example: 'Ada Lovelace',
        },
        email: {
          type: 'string',
          format: 'email',
          example: 'ada.lovelace@c33.io',
        },
        balance: { type: 'number', minimum: 0, example: 1500 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found (CUSTOMER_NOT_FOUND)',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists (CUSTOMER_DUPLICATE_EMAIL)',
  })
  @ApiResponse({
    status: 412,
    description:
      'Precondition failed - resource modified by another request (CUSTOMER_ETAG_MISMATCH)',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid ObjectId or validation failed (VALIDATION_INVALID_OBJECTID, VALIDATION_FAILED)',
  })
  async update(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Body(new JoiValidationPipe(updateCustomerSchema))
    updateCustomerDto: UpdateCustomerDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiSuccessResponse<CustomerResponse>> {
    let currentVersion: number | undefined;

    if (ifMatch) {
      const parsed = parseETag(ifMatch);
      if (!parsed || parsed.id !== id) {
        currentVersion = -1; // Force version mismatch for invalid ETag
      } else {
        currentVersion = parsed.version;
      }
    }

    const customer = await this.customerService.update(
      id,
      updateCustomerDto,
      currentVersion,
    );
    const etag = generateETag(customer._id.toString(), customer.__v);

    res.setHeader('ETag', etag);

    return ok(this.toCustomerResponse(customer));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID (24-character hex ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found (CUSTOMER_NOT_FOUND)',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId (VALIDATION_INVALID_OBJECTID)',
  })
  async remove(
    @Param('id', ObjectIdValidationPipe) id: string,
  ): Promise<ApiSuccessResponse<{ id: string }>> {
    const result = await this.customerService.remove(id);
    return ok(result);
  }

  private toCustomerResponse(customer: CustomerDocument): CustomerResponse {
    return {
      _id: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      balance: customer.balance,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      __v: customer.__v,
    };
  }
}
