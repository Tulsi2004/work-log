/**
 * One-shot data copy: Neon -> Supabase.
 *
 * Run `npx prisma migrate deploy` against Supabase FIRST so the schema and
 * _prisma_migrations history already exist there; this script only moves rows.
 *
 * Reads NEON_URL and SUPABASE_URL from .env.local (or the shell, which wins).
 *
 *   node scripts/migrate-to-supabase.mjs          # add --force to overwrite non-empty tables
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

// Parent-before-child: every FK target is copied before the rows pointing at it.
const TABLES = [
  "Company",
  "Employment",
  "WorkReport",
  "DayPlan",
  "CustomField",
  "CustomFieldValue",
  "UserPreference", // standalone, no FKs
];

const force = process.argv.includes("--force");
const src = process.env.NEON_URL;
const dst = process.env.SUPABASE_URL;
if (!src || !dst) {
  console.error("Need both NEON_URL and SUPABASE_URL in .env.local (or the shell).");
  process.exit(1);
}

const from = new pg.Client({ connectionString: src });
const to = new pg.Client({ connectionString: dst });
await from.connect();
await to.connect();

const columnsOf = async (client, table) => {
  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns
     where table_schema='public' and table_name=$1 order by ordinal_position`,
    [table]
  );
  return rows;
};

// Guard: never silently merge into a database that already holds rows.
for (const t of TABLES) {
  const { rows } = await to.query(`select count(*)::int n from "public"."${t}"`);
  if (rows[0].n > 0 && !force) {
    console.error(`Target "${t}" already has ${rows[0].n} rows. Re-run with --force to overwrite.`);
    process.exit(1);
  }
}

try {
  await to.query("begin");
  if (force) {
    // Reverse order so children go before the parents they reference.
    for (const t of [...TABLES].reverse()) await to.query(`delete from "public"."${t}"`);
  }

  for (const table of TABLES) {
    const cols = await columnsOf(from, table);
    const names = cols.map((c) => c.column_name);
    // node-postgres turns JS arrays into Postgres array literals, which breaks
    // json columns holding arrays — hand those over as text and cast instead.
    const isJson = cols.map((c) => c.data_type === "json" || c.data_type === "jsonb");

    const { rows } = await from.query(
      `select ${names.map((n) => `"${n}"`).join(", ")} from "public"."${table}"`
    );

    for (const row of rows) {
      const values = names.map((n, i) =>
        isJson[i] ? (row[n] === null || row[n] === undefined ? null : JSON.stringify(row[n])) : row[n]
      );
      const params = names.map((n, i) => (isJson[i] ? `$${i + 1}::jsonb` : `$${i + 1}`));
      await to.query(
        `insert into "public"."${table}" (${names.map((n) => `"${n}"`).join(", ")}) values (${params.join(", ")})`,
        values
      );
    }
    console.log(`${String(rows.length).padStart(6)}  ${table}`);
  }

  await to.query("commit");
} catch (err) {
  await to.query("rollback");
  console.error("\nRolled back. Nothing was written.\n", err);
  process.exit(1);
}

console.log("\nVerifying:");
let ok = true;
for (const t of TABLES) {
  const a = (await from.query(`select count(*)::int n from "public"."${t}"`)).rows[0].n;
  const b = (await to.query(`select count(*)::int n from "public"."${t}"`)).rows[0].n;
  if (a !== b) ok = false;
  console.log(`  ${a === b ? "ok  " : "FAIL"} ${t}: neon=${a} supabase=${b}`);
}
await from.end();
await to.end();
process.exit(ok ? 0 : 1);
