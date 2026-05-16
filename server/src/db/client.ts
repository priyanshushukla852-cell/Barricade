import { Pool } from 'pg';
import type { QueryResult } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

export function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params);
}
