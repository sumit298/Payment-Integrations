import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("DB OK:", result.rows);
  } catch (e) {
    console.error("DB ERROR:", e);
  }
})();

export const db = drizzle(pool, { schema });