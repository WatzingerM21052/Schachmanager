import { defineConfig } from "vitest/config";

// Plain Node environment is enough for these pure-function unit tests (password hashing,
// JWT, format/standings logic) - none of them touch a D1 binding directly, so the heavier
// @cloudflare/vitest-pool-workers runtime isn't needed here.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
