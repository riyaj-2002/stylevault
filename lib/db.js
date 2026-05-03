import { neon } from '@neondatabase/serverless';

export function getDB() {
  return neon(process.env.DATABASE_URL);
}
