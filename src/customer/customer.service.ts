import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { FilterQuery, SortOrder } from 'mongoose';

import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
  ValidationError,
} from '../common/errors';
import { ErrorCodes } from '../common/errors/error-codes';
import { mapMongoError } from '../common/errors/mappers';
import type { PaginationMeta } from '../common/types/api-response.type';
import { canonicalizeEmail } from '../common/utils/email.util';
import {
  clampPagination,
  MAX_PAGE_SIZE,
} from '../common/utils/pagination.util';
import { escapeRegex } from '../common/utils/regex.util';

import { CustomerRepository } from './customer.repository';
import type { CreateCustomerDto } from './dtos/create-customer.joi';
import type { ListCustomersQueryDto } from './dtos/list-customers.query.joi';
import type { UpdateCustomerDto } from './dtos/update-customer.joi';
import type { CustomerDocument } from './schemas/customer.schema';
import type { Customer } from './schemas/customer.schema';

export interface ListCustomersResult {
  customers: CustomerDocument[];
  meta: PaginationMeta;
}

@Injectable()
export class CustomerService implements OnModuleInit {
  private readonly logger = new Logger(CustomerService.name);

  constructor(private readonly customerRepository: CustomerRepository) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('CustomerService initialized');
    await this.customerRepository.createIndexes();
  }

  async create(
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerDocument> {
    const emailCanonical = canonicalizeEmail(createCustomerDto.email);

    const existing =
      await this.customerRepository.findByEmailCanonical(emailCanonical);

    if (existing) {
      throw new ConflictError(
        ErrorCodes.CUSTOMER_DUPLICATE_EMAIL,
        `Customer with email ${createCustomerDto.email} already exists`,
        { details: { email: createCustomerDto.email } },
      );
    }

    try {
      return await this.customerRepository.create(createCustomerDto);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ConflictError(
          ErrorCodes.CUSTOMER_DUPLICATE_EMAIL,
          `Customer with email ${createCustomerDto.email} already exists`,
          { details: { email: createCustomerDto.email } },
        );
      }
      throw mapMongoError(error);
    }
  }

  async findAll(
    query: ListCustomersQueryDto = {},
  ): Promise<ListCustomersResult> {
    const { email, name, minBalance, maxBalance, sort } = query;

    // Clamp pagination to prevent DoS
    const { page, pageSize, skip } = clampPagination(
      query.page,
      query.pageSize,
      MAX_PAGE_SIZE,
    );

    const filter: FilterQuery<Customer> = {};

    if (email) {
      const escapedEmail = escapeRegex(email);
      filter.email = { $regex: escapedEmail, $options: 'i' };
    }

    if (name) {
      const escapedName = escapeRegex(name);
      filter.name = { $regex: escapedName, $options: 'i' };
    }

    if (minBalance !== undefined || maxBalance !== undefined) {
      const balanceFilter: { $gte?: number; $lte?: number } = {};

      if (minBalance !== undefined) {
        balanceFilter.$gte = minBalance;
      }

      if (maxBalance !== undefined) {
        balanceFilter.$lte = maxBalance;
      }

      filter.balance = balanceFilter;
    }

    let sortObj: Record<string, SortOrder> | undefined;

    if (sort) {
      const isDescending = sort.startsWith('-');
      const field = isDescending ? sort.substring(1) : sort;
      sortObj = { [field]: isDescending ? -1 : 1 };
    } else {
      sortObj = { createdAt: -1 };
    }

    const [customers, total] = await Promise.all([
      this.customerRepository.findAll({
        skip,
        limit: pageSize,
        filter,
        sort: sortObj,
      }),
      this.customerRepository.count(filter),
    ]);

    return {
      customers,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: string): Promise<CustomerDocument> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError(
        ErrorCodes.CUSTOMER_NOT_FOUND,
        `Customer with ID ${id} not found`,
      );
    }
    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    currentVersion?: number,
  ): Promise<CustomerDocument> {
    if (Object.keys(updateCustomerDto).length === 0) {
      throw new ValidationError(
        ErrorCodes.CUSTOMER_UPDATE_EMPTY,
        'At least one field must be provided for update',
      );
    }

    if (updateCustomerDto.email) {
      const emailCanonical = canonicalizeEmail(updateCustomerDto.email);
      const existing =
        await this.customerRepository.findByEmailCanonical(emailCanonical);

      if (existing) {
        const existingId = String(existing._id);
        if (existingId !== id) {
          throw new ConflictError(
            ErrorCodes.CUSTOMER_DUPLICATE_EMAIL,
            `Customer with email ${updateCustomerDto.email} already exists`,
            { details: { email: updateCustomerDto.email } },
          );
        }
      }
    }

    const customer = await this.customerRepository.updateById(
      id,
      updateCustomerDto,
      currentVersion,
    );

    if (!customer) {
      // Distinguish between not found and version conflict
      if (currentVersion !== undefined) {
        const existing = await this.customerRepository.findById(id);
        if (existing) {
          throw new PreconditionFailedError(
            ErrorCodes.CUSTOMER_ETAG_MISMATCH,
            'Resource has been modified by another request',
            { details: { currentVersion: existing.__v } },
          );
        }
      }

      throw new NotFoundError(
        ErrorCodes.CUSTOMER_NOT_FOUND,
        `Customer with ID ${id} not found`,
      );
    }

    return customer;
  }

  async remove(id: string): Promise<{ id: string }> {
    const customer = await this.customerRepository.deleteById(id);

    if (!customer) {
      throw new NotFoundError(
        ErrorCodes.CUSTOMER_NOT_FOUND,
        `Customer with ID ${id} not found`,
      );
    }
    return { id };
  }
}
