import { Pool } from "pg";

let pool: Pool | null = null;

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({ connectionString });
  }

  return pool;
}
