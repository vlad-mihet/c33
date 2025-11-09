import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { escapeRegExp } from 'lodash';
import { CustomerRepository } from './customer.repository';
import { CreateCustomerDto } from './dtos/create-customer.joi';
import { UpdateCustomerDto } from './dtos/update-customer.joi';
import { CustomerDocument } from './schemas/customer.schema';

export interface PaginationParams {
  page?: number;
  limit?: number;
  name?: string;
  email?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CustomerService implements OnModuleInit {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly customerRepository: CustomerRepository) {}

  async onModuleInit() {
    this.logger.log('CustomerService initialized');
    await this.customerRepository.createIndexes();
  }

  async create(
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerDocument> {
    // Check for duplicate email
    const existing = await this.customerRepository.findByEmail(
      createCustomerDto.email,
    );
    if (existing) {
      throw new ConflictException(
        `Customer with email ${createCustomerDto.email} already exists`,
      );
    }

    try {
      return await this.customerRepository.create(createCustomerDto);
    } catch (error) {
      // MongoDB duplicate key error
      if (error.code === 11000) {
        throw new ConflictException(
          `Customer with email ${createCustomerDto.email} already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(
    params: PaginationParams = {},
  ): Promise<PaginatedResponse<CustomerDocument>> {
    const { page = 1, limit = 10, name, email } = params;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: {
      name?: { $regex: string; $options: string };
      email?: { $regex: string; $options: string };
    } = {};

    if (name) {
      filter.name = { $regex: escapeRegExp(name), $options: 'i' }; // Case-insensitive search
    }

    if (email) {
      filter.email = { $regex: escapeRegExp(email), $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.customerRepository.findAll({ skip, limit, filter }),
      this.customerRepository.count(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CustomerDocument> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    // If email is being updated, check for duplicates
    if (updateCustomerDto.email) {
      const existing = await this.customerRepository.findByEmail(
        updateCustomerDto.email,
      );
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(
          `Customer with email ${updateCustomerDto.email} already exists`,
        );
      }
    }

    const customer = await this.customerRepository.updateById(
      id,
      updateCustomerDto,
    );
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async remove(id: string): Promise<CustomerDocument> {
    const customer = await this.customerRepository.deleteById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }
}
