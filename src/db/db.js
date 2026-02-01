import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

// Parse the URL to handle SSL settings programmatically
const dbUrl = new URL(process.env.DATABASE_URL);

// Remove 'sslmode' query param to avoid conflicts and the "SECURITY WARNING"
if (dbUrl.searchParams.has("sslmode")) {
  dbUrl.searchParams.delete("sslmode");
}

// Check if running on localhost to avoid SSL locally
const isLocal =
  dbUrl.hostname === "localhost" || dbUrl.hostname === "127.0.0.1";

export const pool = new Pool({
  connectionString: dbUrl.toString(), // Use the cleaned URL
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool);
