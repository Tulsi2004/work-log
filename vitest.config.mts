import { defineConfig } from "vitest/config";

// Deterministic local zone for the "local copy" date math; tz-specific logic passes zones explicitly.
process.env.TZ ??= "UTC";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
});
