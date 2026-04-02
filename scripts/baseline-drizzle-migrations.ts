/**
 * Use this ONCE when your Postgres database already has the full schema
 * (e.g. created with `drizzle-kit push` or Neon) but `drizzle.__drizzle_migrations`
 * is empty or incomplete. Drizzle would otherwise try to re-run 0000 and fail.
 *
 * This inserts rows for every migration EXCEPT the last one in meta/_journal.json
 * (so the next `npm run db:migrate` only applies pending SQL, e.g. 0008).
 *
 * Requires DATABASE_URL (e.g. from .env in project root).
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(rootDir, "..", ".env") });
config({ path: path.resolve(rootDir, "..", ".env.local") });

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const journalPath = path.resolve(rootDir, "..", "migrations", "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: Array<{ tag: string; when: number }>;
  };
  const entries = journal.entries;
  if (entries.length < 2) {
    console.error("Journal must list at least two migrations.");
    process.exit(1);
  }

  const toBaseline = entries.slice(0, -1);
  const pending = entries[entries.length - 1];

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    let inserted = 0;
    for (const entry of toBaseline) {
      const sqlPath = path.resolve(rootDir, "..", "migrations", `${entry.tag}.sql`);
      const query = readFileSync(sqlPath, "utf8");
      const hash = createHash("sha256").update(query).digest("hex");

      const res = await client.query(
        `INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
         SELECT $1::text, $2::bigint
         WHERE NOT EXISTS (
           SELECT 1 FROM drizzle.__drizzle_migrations WHERE hash = $1
         )`,
        [hash, entry.when]
      );
      inserted += res.rowCount ?? 0;
    }

    console.log(
      `Baseline done: inserted ${inserted} of ${toBaseline.length} migration record(s).` +
        ` Next run: npm run db:migrate (should apply only ${pending.tag}).`
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
