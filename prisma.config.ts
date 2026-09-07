import { config } from "dotenv";
import { defineConfig, env } from "@prisma/config";

config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrations need a session-mode connection; the transaction pooler in
    // DATABASE_URL cannot hold the advisory locks migrate relies on.
    url: env("DIRECT_URL"),
  },
});
