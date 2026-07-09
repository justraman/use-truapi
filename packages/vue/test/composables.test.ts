import { createRuntime, defineConfig } from "@use-truapi/core";
import { mount } from "@vue/test-utils";
import type { ChainDefinition } from "polkadot-api";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";
import {
  TruapiPlugin,
  useAccounts,
  useFormattedBalance,
  useHostMode,
  useHostStorage,
  useRuntime,
  useTheme,
} from "../src/index";

const config = defineConfig({
  chains: { test: { descriptor: {} as ChainDefinition, genesisHash: "0x11" as `0x${string}` } },
});

function withSetup<T>(setup: () => T, runtime = createRuntime(config)) {
  let result: T | undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup();
        return () => h("div");
      },
    }),
    { global: { plugins: [[TruapiPlugin, { runtime }]] } },
  );
  if (result === undefined) throw new Error("setup did not run");
  return { result, wrapper };
}

const flush = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe("TruapiPlugin / useRuntime", () => {
  it("provides the runtime", () => {
    const runtime = createRuntime(config);
    const { result } = withSetup(() => useRuntime(), runtime);
    expect(result).toBe(runtime);
  });
});

describe("host composables", () => {
  it("useHostMode settles on standalone in tests", async () => {
    const { result } = withSetup(() => useHostMode());
    await flush();
    expect(result.value).toBe("standalone");
  });

  it("useTheme falls back to the system scheme", () => {
    const { result } = withSetup(() => useTheme());
    expect(["light", "dark"]).toContain(result.value.variant);
    expect(result.value.source).toBe("system");
  });

  it("useHostStorage round-trips through localStorage", async () => {
    const { result } = withSetup(() => useHostStorage<{ n: number }>("vue-key"));
    await flush();
    await result.set({ n: 9 });
    await flush();
    expect(result.data.value).toEqual({ n: 9 });
    await result.remove();
    await flush();
    expect(result.data.value).toBeNull();
  });
});

describe("account composables", () => {
  it("useAccounts connects to dev accounts standalone", async () => {
    const { result } = withSetup(() => useAccounts());
    expect(result.status.value).toBe("disconnected");
    await result.connect();
    expect(result.isConnected.value).toBe(true);
    expect(result.accounts.value.length).toBeGreaterThan(0);
    expect(result.selectedAccount.value).not.toBeNull();
  });
});

describe("format composables", () => {
  it("useFormattedBalance renders planck with decimals", () => {
    const { result } = withSetup(() =>
      useFormattedBalance(12_345_600_000n, { decimals: 10, symbol: "PAS" }),
    );
    expect(result.value).toContain("1.2");
    expect(result.value).toContain("PAS");
  });
});
