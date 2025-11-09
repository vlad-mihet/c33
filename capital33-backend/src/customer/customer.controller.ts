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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { createCustomerSchema } from './dtos/create-customer.joi';
import type { CreateCustomerDto } from './dtos/create-customer.joi';
import { updateCustomerSchema } from './dtos/update-customer.joi';
import type { UpdateCustomerDto } from './dtos/update-customer.joi';
import { JoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { ObjectIdValidationPipe } from '../common/pipes/objectid-validation.pipe';

@ApiTags('Customers')
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
        name: { type: 'string', minLength: 2, example: 'Ada Lovelace' },
        email: {
          type: 'string',
          format: 'email',
          example: 'ada@c33.io',
        },
        balance: { type: 'number', default: 0, example: 1200 },
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
    description: 'Customer with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers with pagination and filters' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Filter by name (case-insensitive partial match)',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email (case-insensitive partial match)',
  })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
  })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('email') email?: string,
  ) {
    return this.customerService.findAll({ page, limit, name, email });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer found',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId',
  })
  findOne(@Param('id', ObjectIdValidationPipe) id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new JoiValidationPipe(updateCustomerSchema))
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    description: 'Customer update payload (partial)',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, example: 'Ada Lovelace' },
        email: {
          type: 'string',
          format: 'email',
          example: 'ada.lovelace@c33.io',
        },
        balance: { type: 'number', example: 1500 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId',
  })
  update(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer' })
  @ApiParam({
    name: 'id',
    description: 'Customer ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ObjectId',
  })
  remove(@Param('id', ObjectIdValidationPipe) id: string) {
    return this.customerService.remove(id);
  }
}
