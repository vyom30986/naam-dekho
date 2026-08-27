/**
 * Load the name corpus into a freshly migrated database.
 *
 *   npm run db:migrate   # creates the tables
 *   npm run db:seed      # fills corpus_names
 *
 * The corpus is the one piece of project data that cannot be regenerated from
 * the code: 536 names, most carrying a meaning that was checked against a
 * cited dictionary, and 210 carrying a Devanagari spelling that was verified
 * rather than transliterated. Without it `npm run build:names` falls back to
 * the 50-name list in src/scripts/name-corpus.ts and the SEO build collapses
 * from ~697 pages to about 50.
 *
 * Safe to re-run. Every row is upserted on the slug, so a second run refreshes
 * the corpus instead of failing on duplicate keys, and nothing else in the
 * database is touched. No customer data is in this file.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { env } from "../config.js";
import { logger } from "../logger.js";

const here = dirname(fileURLToPath(import.meta.url));
const seedFile = join(here, "..", "..", "seed", "corpus_names.sql");

const sql = await readFile(seedFile, "utf8");

/* pg_dump --column-inserts writes exactly one self-contained INSERT per line,
 * so the file is parsed a line at a time. Splitting on semicolons instead is
 * what you reach for first and it is wrong twice over: the dump's comment
 * header lands in the same chunk as the first INSERT and silently swallows it
 * (this cost the corpus its first name, Krishna, before the count check below
 * caught it), and any meaning containing a semicolon would split mid-row.
 *
 * Re-running the raw dump would fail on the primary key, so each statement is
 * turned into an upsert on the way in. That keeps the script idempotent, which
 * matters because the usual reason to run it twice is that somebody corrected
 * the corpus and wants the fixes in. */
const lines = sql.split(/\r?\n/);
const insertLines = lines.filter((l) => l.startsWith("INSERT INTO"));

/* If a future dump ever wraps a row across lines, every wrapped row would be
 * dropped without a word and the corpus would come out quietly short. Refuse
 * to run instead: a loud failure is recoverable, a short corpus is not. */
const malformed = insertLines.filter((l) => !l.trimEnd().endsWith(";"));
if (malformed.length > 0) {
  logger.error(
    `${malformed.length} INSERT statement(s) in ${seedFile} span multiple lines, which this loader cannot parse. ` +
      `Regenerate the dump with: pg_dump --data-only --no-owner --no-privileges --table=corpus_names --column-inserts`,
  );
  process.exit(1);
}

const statements = insertLines
  .map((l) => l.trimEnd().replace(/;$/, ""))
  .map(
    (s) =>
      s +
      ` ON CONFLICT (slug) DO UPDATE SET
          name            = EXCLUDED.name,
          gender          = EXCLUDED.gender,
          origin          = EXCLUDED.origin,
          meaning         = EXCLUDED.meaning,
          meaning_source  = EXCLUDED.meaning_source,
          meaning_url     = EXCLUDED.meaning_url,
          verified        = EXCLUDED.verified,
          published       = EXCLUDED.published,
          native_spelling = EXCLUDED.native_spelling,
          updated_at      = EXCLUDED.updated_at`,
  );

if (statements.length === 0) {
  logger.error(`No INSERT statements found in ${seedFile}. Nothing to seed.`);
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const client = await pool.connect();

try {
  /* One transaction: a half-loaded corpus is worse than none, because the SEO
   * build would happily emit pages for whichever names made it in. */
  await client.query("BEGIN");
  for (const statement of statements) await client.query(statement);
  await client.query("COMMIT");

  const { rows } = await client.query<{
    total: string;
    with_meaning: string;
    with_spelling: string;
  }>(`select count(*)                                                        as total,
             count(*) filter (where meaning is not null and meaning <> '')          as with_meaning,
             count(*) filter (where native_spelling is not null and native_spelling <> '') as with_spelling
      from corpus_names`);

  const r = rows[0]!;
  logger.info(
    `Corpus seeded: ${r.total} names, ${r.with_meaning} with a meaning, ${r.with_spelling} with a verified Devanagari spelling.`,
  );
} catch (err) {
  await client.query("ROLLBACK");
  logger.error({ err }, "Seed failed and was rolled back. The corpus is unchanged.");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
