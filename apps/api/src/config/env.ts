import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Uploaded files live here, outside the web root (HLD 2). Relative paths start at apps/api. Back it up with the database.
  STORAGE_DIR: z.string().min(1).default('storage'),
});

export const env = schema.parse(process.env);
