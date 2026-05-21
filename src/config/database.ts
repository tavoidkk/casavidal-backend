import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = require('ws');
}

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});
const adapter = new PrismaNeon(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'info'] : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma, pool };
