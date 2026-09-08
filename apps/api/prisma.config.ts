import { config } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  config({ path: resolve(process.cwd(), '../../.env'), override: true });
  config({ override: true });
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || '',
  },
});
