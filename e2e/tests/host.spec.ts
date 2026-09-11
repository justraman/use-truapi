import { PASEO_ASSET_HUB } from "@parity/host-api-test-sdk";
import { type TestHost, createTestHostFixture } from "@parity/host-api-test-sdk/playwright";
import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";
import { test as base, expect } from "@playwright/test";

const { testHost } = createTestHostFixture({
  productUrl: "http://localhost:4173",
  accounts: ["alice", "bob"],
  // The app connects via its product account; map it to funded Alice. The
  // test host predates product context, so the app falls back to `<dappName>.dot`.
  productAccounts: { "use-truapi-example.dot/0": "alice" },
  // Paseo Asset Hub Next is re-genesised periodically and the test-sdk's pinned
  // constant lags; route by the genesis the example's descriptor (and so its
  // config fallback) carries, which is what the app asks the host for.
  networks: [{ ...PASEO_ASSET_HUB, genesisHash: paseo_asset_hub.genesis as `0x${string}` }],
});

const test = base.extend<{ testHost: TestHost }>({ testHost });

// Chain-data panels (block number, balance) are intentionally not asserted:
// they depend on live RPC connectivity the test environment may not have.

test("product loads in the host and connects via the host provider", async ({ testHost }) => {
  await testHost.waitForConnection();
  const frame = testHost.productFrame();
  await frame.locator('[data-testid="connect"]').click();
  // The test host predates product context, so connect first waits out the
  // 3 s best-effort probe before deriving the account from `<dappName>.dot`.
  await expect(frame.locator('[data-testid="selected-account"]')).toBeVisible({ timeout: 10_000 });
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
