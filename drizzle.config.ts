import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Default to beginner shard, switch based on terminal flag
let dbUrl = process.env.DATABASE_URL_BEG;
if (process.env.DB_TARGET === 'INT') dbUrl = process.env.DATABASE_URL_INT;
if (process.env.DB_TARGET === 'ADV') dbUrl = process.env.DATABASE_URL_ADV;

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl!,
  },
});