import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from '../../src/customer/customer.service';
import { CustomerRepository } from '../../src/customer/customer.repository';

describe('CustomerService', () => {
  let service: CustomerService;
  let repository: CustomerRepository;

  const mockCustomer = {
    _id: 'mock-id',
    name: 'Test Customer',
    email: 'test@example.com',
    balance: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    createIndexes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repository = module.get<CustomerRepository>(CustomerRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const createDto = {
        name: 'Test Customer',
        email: 'test@example.com',
        balance: 100,
      };

      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(mockRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockCustomer);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createDto = {
        name: 'Test Customer',
        email: 'existing@example.com',
        balance: 100,
      };

      mockRepository.findByEmail.mockResolvedValue(mockCustomer);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a customer by id', async () => {
      mockRepository.findById.mockResolvedValue(mockCustomer);

      const result = await service.findOne('mock-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('mock-id');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [mockCustomer];
      mockRepository.findAll.mockResolvedValue(mockCustomers);
      mockRepository.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockCustomers,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should filter by name', async () => {
      const mockCustomers = [mockCustomer];
      mockRepository.findAll.mockResolvedValue(mockCustomers);
      mockRepository.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, name: 'Test' });

      expect(mockRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        limit: 10,
        filter: { name: { $regex: 'Test', $options: 'i' } },
      });
    });
  });

  describe('update', () => {
    it('should update a customer', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedCustomer = { ...mockCustomer, name: 'Updated Name' };

      mockRepository.updateById.mockResolvedValue(updatedCustomer);

      const result = await service.update('mock-id', updateDto);

      expect(mockRepository.updateById).toHaveBeenCalledWith(
        'mock-id',
        updateDto,
      );
      expect(result).toEqual(updatedCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.updateById.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for email conflicts when updating email', async () => {
      const updateDto = { email: 'new@example.com' };
      const existingCustomer = { ...mockCustomer, _id: 'different-id' };

      mockRepository.findByEmail.mockResolvedValue(existingCustomer);

      await expect(service.update('mock-id', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a customer', async () => {
      mockRepository.deleteById.mockResolvedValue(mockCustomer);

      const result = await service.remove('mock-id');

      expect(mockRepository.deleteById).toHaveBeenCalledWith('mock-id');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockRepository.deleteById.mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
