import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';

import { ValidationError } from '../common/errors/domain-errors';
import { ErrorCodes } from '../common/errors/error-codes';
import { canonicalizeEmail } from '../common/utils/email.util';

import { Customer } from './schemas/customer.schema';
import type { CustomerDocument } from './schemas/customer.schema';

export interface FindAllOptions {
  skip?: number;
  limit?: number;
  filter?: FilterQuery<Customer>;
  sort?: Record<string, SortOrder>;
}

@Injectable()
export class CustomerRepository {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Create a new customer.
   *
   * @param data - Customer data
   * @returns Created customer document
   */
  async create(data: Partial<Customer>): Promise<CustomerDocument> {
    const customer = new this.customerModel(data);
    return customer.save();
  }

  async findById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel
      .findById(id)
      .lean()
      .exec() as Promise<CustomerDocument | null>;
  }

  async findByEmailCanonical(
    emailCanonical: string,
  ): Promise<CustomerDocument | null> {
    return this.customerModel
      .findOne({ emailCanonical })
      .lean()
      .exec() as Promise<CustomerDocument | null>;
  }

  async findAll(options: FindAllOptions = {}): Promise<CustomerDocument[]> {
    const { skip = 0, limit = 20, filter = {}, sort } = options;
    const query = this.customerModel
      .find(filter, {
        name: 1,
        email: 1,
        emailCanonical: 1,
        balance: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .skip(skip)
      .limit(limit);

    if (sort) {
      query.sort(sort);
    }

    return query.lean().exec() as Promise<CustomerDocument[]>;
  }

  /**
   * Count customers matching filter.
   *
   * @param filter - MongoDB filter query
   * @returns Count of matching customers
   */
  async count(filter: FilterQuery<Customer> = {}): Promise<number> {
    return this.customerModel.countDocuments(filter).exec();
  }

  async updateById(
    id: string,
    data: Partial<Customer>,
    currentVersion?: number,
  ): Promise<CustomerDocument | null> {
    const filter: FilterQuery<Customer> = { _id: id };

    if (currentVersion !== undefined) {
      filter.__v = currentVersion;
    }

    const updateData: Partial<Customer> & { emailCanonical?: string } = {
      ...data,
    };

    if (data.email) {
      updateData.email = data.email.trim();
      updateData.emailCanonical = canonicalizeEmail(data.email);
    }

    if (data.name) {
      updateData.name = data.name.trim().replace(/\s+/g, ' ');
    }

    return this.customerModel
      .findOneAndUpdate(
        filter,
        { $set: updateData, $inc: { __v: 1 } },
        { new: true },
      )
      .exec();
  }

  /**
   * Delete customer by ID.
   *
   * @param id - Customer ID (24-character hex ObjectId)
   * @returns Deleted document or null if not found
   */
  async deleteById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  async upsertByEmail(data: Partial<Customer>): Promise<{
    customer: CustomerDocument;
    wasNew: boolean;
  }> {
    if (!data.email) {
      throw new ValidationError(
        ErrorCodes.CUSTOMER_MISSING_EMAIL,
        'Email is required for upsert operation',
      );
    }

    const emailCanonical = canonicalizeEmail(data.email);
    const existing = await this.findByEmailCanonical(emailCanonical);
    const wasNew = !existing;

    const normalizedData: Partial<Customer> & { emailCanonical: string } = {
      ...data,
      email: data.email.trim(),
      emailCanonical,
    };

    if (data.name) {
      normalizedData.name = data.name.trim().replace(/\s+/g, ' ');
    }

    const result = await this.customerModel
      .findOneAndUpdate(
        { emailCanonical },
        { $set: normalizedData },
        { new: true, upsert: true },
      )
      .exec();

    // Result should never be null with upsert:true, but add runtime check
    return {
      customer: result as CustomerDocument,
      wasNew,
    };
  }

  async createIndexes(): Promise<void> {
    try {
      await this.customerModel.createIndexes();
      this.logger.log('Customer indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create customer indexes', error);
    }
  }
}
