import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { CustomerService } from '../src/customer/customer.service';

async function seed(): Promise<void> {
  console.warn('🌱 Starting database seed...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const customerService = app.get(CustomerService);

  const sampleCustomers = [
    {
      name: 'Ada Lovelace',
      email: 'ada.lovelace@c33.io',
      balance: 15000,
    },
    {
      name: 'Alan Turing',
      email: 'alan.turing@c33.io',
      balance: 12500,
    },
    {
      name: 'Grace Hopper',
      email: 'grace.hopper@c33.io',
      balance: 18000,
    },
    {
      name: 'Margaret Hamilton',
      email: 'margaret.hamilton@c33.io',
      balance: 20000,
    },
    {
      name: 'Donald Knuth',
      email: 'donald.knuth@c33.io',
      balance: 5000,
    },
  ];

  for (const customerData of sampleCustomers) {
    try {
      const customer = await customerService.create(customerData);
      console.warn(`✅ Created customer: ${customer.name} (${customer.email})`);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 409
      ) {
        console.warn(
          `⚠️  Customer already exists: ${customerData.email} (skipping)`,
        );
      } else {
        console.error(
          `❌ Error creating customer ${customerData.email}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  console.warn('✨ Seed complete!');
  await app.close();
}

seed().catch((error: unknown) => {
  console.error(
    '💥 Seed failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
