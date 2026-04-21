import pg from "pg";
import { dbConfig } from "../config/db.config.js";

const { Pool } = pg;

if (!dbConfig.connectionString) {
  throw new Error("DATABASE_URL nao configurada no backend/.env.");
}

export const pool = new Pool({
  connectionString: dbConfig.connectionString,
  ssl: dbConfig.ssl,
});

export async function testDatabaseConnection() {
  const result = await pool.query("select current_database() as database, now() as server_time;");

  return result.rows[0];
}
