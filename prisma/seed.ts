import { PrismaPg } from '@prisma/adapter-pg';
import { hashApiKey } from '../src/auth/api-key.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment
}

// Development-only keys, documented in the README. Only their hashes are stored.
const DEV_ORGANIZATIONS = [
  { name: 'Acme Corp', apiKey: 'dev-key-acme-0001' },
  { name: 'Globex Inc', apiKey: 'dev-key-globex-0002' },
];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

for (const org of DEV_ORGANIZATIONS) {
  const apiKeyHash = hashApiKey(org.apiKey);
  await prisma.organization.upsert({
    where: { apiKeyHash },
    update: { name: org.name },
    create: { name: org.name, apiKeyHash },
  });
}

await prisma.$disconnect();
console.log(`Seeded ${DEV_ORGANIZATIONS.length} organizations`);
