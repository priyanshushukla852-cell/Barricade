import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import logger from '../logger';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

export function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params);
}
