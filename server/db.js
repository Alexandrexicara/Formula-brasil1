import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) console.warn('DATABASE_URL is not configured');
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});
pool.on('error', err => console.error('PostgreSQL pool error:', err.message));
