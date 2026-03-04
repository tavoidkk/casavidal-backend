import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

// Use WebSocket for local dev (Node.js environment)
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws');
}

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };