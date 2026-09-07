import { config } from "dotenv";
import { defineConfig } from "@prisma/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

// Migrations need a session-mode connection; the transaction pooler in
// DATABASE_URL cannot hold the advisory locks migrate relies on. Only
// migrate/introspect use this — the build on Vercel just runs `prisma
// generate`, which needs no URL, so a missing DIRECT_URL must not throw.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
