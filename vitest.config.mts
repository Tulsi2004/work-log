import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Deterministic local zone for the "local copy" date math; tz-specific logic passes zones explicitly.
process.env.TZ ??= "UTC";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
