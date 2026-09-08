import './config.js';
import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 15000 },
});
