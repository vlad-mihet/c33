import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CustomerService } from '../src/customer/customer.service';

async function seed() {
  console.log('🌱 Starting database seed...');

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
      console.log(`✅ Created customer: ${customer.name} (${customer.email})`);
    } catch (error) {
      if (error.status === 409) {
        console.log(
          `⚠️  Customer already exists: ${customerData.email} (skipping)`,
        );
      } else {
        console.error(`❌ Error creating customer ${customerData.email}:`, error.message);
      }
    }
  }

  console.log('✨ Seed complete!');
  await app.close();
}

seed().catch((error) => {
  console.error('💥 Seed failed:', error);
  process.exit(1);
});
