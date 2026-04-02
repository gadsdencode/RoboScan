import { defineConfig } from "drizzle-kit";

// Don't throw during build time - drizzle.config.ts is only used for drizzle-kit commands,
// not during the Vercel build process. This prevents "DATABASE_URL not set" errors during deployment.
const databaseUrl = process.env.DATABASE_URL || "";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  // Only validate URL when actually running drizzle-kit commands
  strict: !!process.env.DATABASE_URL,
});
