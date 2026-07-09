import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));

// Serves the BUILT react example — run `bun run --cwd ../apps/example-react build`
// first (nx wires this up via `e2e` dependsOn `^build`).
export default defineConfig({
  testDir: "./tests",
  retries: 1,
  reporter: [["list"]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "bunx vite preview --port 4173 --strictPort",
    cwd: path.resolve(here, "../apps/example-react"),
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
