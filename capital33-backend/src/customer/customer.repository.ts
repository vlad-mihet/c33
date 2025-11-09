import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';

export interface FindAllOptions {
  skip?: number;
  limit?: number;
  filter?: FilterQuery<Customer>;
}

@Injectable()
export class CustomerRepository {
  private readonly logger = new Logger(CustomerRepository.name);

  constructor(
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  async create(data: Partial<Customer>): Promise<CustomerDocument> {
    const customer = new this.customerModel(data);
    return customer.save();
  }

  async findById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findAll(options: FindAllOptions = {}): Promise<CustomerDocument[]> {
    const { skip = 0, limit = 10, filter = {} } = options;
    return this.customerModel.find(filter).skip(skip).limit(limit).exec();
  }

  async count(filter: FilterQuery<Customer> = {}): Promise<number> {
    return this.customerModel.countDocuments(filter).exec();
  }

  async updateById(
    id: string,
    data: Partial<Customer>,
  ): Promise<CustomerDocument | null> {
    return this.customerModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteById(id: string): Promise<CustomerDocument | null> {
    return this.customerModel.findByIdAndDelete(id).exec();
  }

  /**
   * Upsert customer by email (used for imports)
   */
  async upsertByEmail(data: Partial<Customer>): Promise<{
    customer: CustomerDocument;
    wasNew: boolean;
  }> {
    if (!data?.email) {
      throw new Error('Email is required for upsert operation');
    }

    const existing = await this.findByEmail(data.email);
    const wasNew = !existing;

    const result = await this.customerModel
      .findOneAndUpdate(
        { email: data.email.toLowerCase() },
        { $set: data },
        { new: true, upsert: true },
      )
      .exec();

    return {
      customer: result,
      wasNew,
    };
  }

  /**
   * Ensure indexes are created (called on module initialization)
   */
  async createIndexes(): Promise<void> {
    try {
      await this.customerModel.createIndexes();
      this.logger.log('Customer indexes created successfully');
    } catch (error) {
      this.logger.error('Failed to create customer indexes', error);
    }
  }
}
