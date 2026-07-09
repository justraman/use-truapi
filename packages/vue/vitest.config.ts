import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@use-truapi/core": new URL("../core/src/index.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
  },
});
