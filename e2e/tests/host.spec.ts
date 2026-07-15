import { createTestHostFixture, type TestHost } from "@parity/host-api-test-sdk/playwright";
import { expect, test as base } from "@playwright/test";

const { testHost } = createTestHostFixture({
  productUrl: "http://localhost:4173",
  accounts: ["alice", "bob"],
  // The app connects via its product account; map it to funded Alice.
  productAccounts: { "use-truapi-example.dot/0": "alice" },
});

const test = base.extend<{ testHost: TestHost }>({ testHost });

// Chain-data panels (block number, balance) are intentionally not asserted:
// they depend on live RPC connectivity the test environment may not have.

test("product loads in the host and connects via the host provider", async ({ testHost }) => {
  await testHost.waitForConnection();
  const frame = testHost.productFrame();
  await frame.locator('[data-testid="connect"]').click();
  await expect(frame.locator('[data-testid="selected-account"]')).toBeVisible();
  await expect(frame.locator('[data-testid="selected-account"]')).not.toBeEmpty();
});

test("host mode badge shows host", async ({ testHost }) => {
  await testHost.waitForConnection();
  const frame = testHost.productFrame();
  await expect(frame.locator('[data-testid="host-mode"]')).toHaveText("host");
});

test("all hook panels render in host mode", async ({ testHost }) => {
  await testHost.waitForConnection();
  const frame = testHost.productFrame();
  // Contract panel resolves the deployed counter from cdm.json (no RPC needed to render).
  await expect(frame.locator('[data-testid="counter-increment"]')).toBeVisible();
  // Host-only panels switch from their standalone fallback to the real UI.
  await expect(frame.locator('[data-testid="statement-input"]')).toBeVisible();
  await expect(frame.locator('[data-testid="chat-input"]')).toBeVisible();
  await expect(frame.locator('[data-testid="payment-topup"]')).toBeVisible();
  await expect(frame.locator('[data-testid="upload-input"]')).toBeVisible();
  await expect(frame.locator('[data-testid="note-input"]')).toBeVisible();
});

test("theme switch propagates to the app", async ({ testHost }) => {
  await testHost.waitForConnection();
  const frame = testHost.productFrame();
  const root = frame.locator('[data-testid="app-root"]');

  await testHost.setTheme("dark");
  await expect(root).toHaveAttribute("data-theme", "dark");

  await testHost.setTheme("light");
  await expect(root).toHaveAttribute("data-theme", "light");
});
