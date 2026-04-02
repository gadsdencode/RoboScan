import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

// Load .env / .env.local from project root so `npm run db:migrate` sees DATABASE_URL without
// exporting it manually in the shell (Git Bash, Windows, etc.).
// Use `rootDir` (not `__dirname`): drizzle-kit may inject `__dirname` and cause a redeclare error.
const rootDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(rootDir, ".env") });
config({ path: path.resolve(rootDir, ".env.local") });

// drizzle.config.ts is only used for drizzle-kit CLI, not the Vercel client build.
const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to a `.env` or `.env.local` file in the project root (e.g. your Neon connection string), or export DATABASE_URL in your shell before running drizzle-kit."
  );
}

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
