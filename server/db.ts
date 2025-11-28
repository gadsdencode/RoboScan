import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

// Lazy initialization - don't throw at module load time
let dbInstance: NeonHttpDatabase<typeof schema> | null = null;
let sqlInstance: NeonQueryFunction<false, false> | null = null;

/**
 * Get the database connection lazily.
 * This defers the environment variable check until the database is actually needed,
 * preventing serverless function crashes during cold start.
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
    sqlInstance = neon(process.env.DATABASE_URL);
    dbInstance = drizzle(sqlInstance, { schema });
  }
  return dbInstance;
}

// For backwards compatibility - this is a getter that lazily initializes
// WARNING: Using this directly will throw if DATABASE_URL is not set
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
