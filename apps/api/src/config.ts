import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: resolve(process.cwd(), '../../.env'), override: true });
  dotenv.config({ path: resolve(process.cwd(), '.env'), override: true });
}
export const config = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    PORT: z.coerce.number().default(4000),
    WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  })
  .parse(process.env);
