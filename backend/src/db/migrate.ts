/**
 * Run `npm run db:generate` first to produce drizzle/migrations,
 * then `npm run db:migrate` to apply them.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { env } from "../config.js";
import { logger } from "../logger.js";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool);

logger.info("Running migrations…");
await migrate(db, { migrationsFolder: "./drizzle" });
logger.info("Migrations complete.");
await pool.end();
