import type { ChainDefinition } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { createChainController } from "../src/chain";
import { defineConfig } from "../src/config";
import { createHostController, isUnsupportedCall } from "../src/host";
import { createLocaleStore } from "../src/locale";
import { createPreimageController } from "../src/preimage";

// Node has no host container: every host-only capability must degrade to null
// (reads) or HostUnavailableError (actions) instead of hanging or throwing raw.
describe("host capabilities standalone", () => {
  it("host info, product context and chain discovery resolve null", async () => {
    const host = createHostController();
    await expect(host.getInfo()).resolves.toBeNull();
    await expect(host.getProductContext()).resolves.toBeNull();
    await expect(host.getChainInfo(["AssetHub", "People"])).resolves.toBeNull();
  });

  it("memoizes host info and product context", async () => {
    const host = createHostController();
    expect(host.getInfo()).toBe(host.getInfo());
    expect(host.getProductContext()).toBe(host.getProductContext());
    await host.getInfo();
  });

  it("reports the transport as disconnected", async () => {
    const host = createHostController();
    expect(host.connectionStatus.get()).toBe("disconnected");
    const seen: string[] = [];
    const stop = host.connectionStatus.subscribe((s) => seen.push(s));
    await host.detect();
    await new Promise((r) => setTimeout(r, 5));
    expect(host.connectionStatus.get()).toBe("disconnected");
    stop();
  });

  it("classifies the Unsupported wire error", () => {
    expect(isUnsupportedCall({ tag: "Unsupported" })).toBe(true);
    expect(isUnsupportedCall({ tag: "Domain", value: { tag: "V1", value: {} } })).toBe(false);
    expect(isUnsupportedCall(new Error("x"))).toBe(false);
    expect(isUnsupportedCall(null)).toBe(false);
  });
});

describe("locale store", () => {
  it("falls back to navigator.language standalone", async () => {
    const locale = createLocaleStore(createHostController());
    const initial = locale.get();
    expect(initial.source).toBe("navigator");
    expect(initial.languageTag.length).toBeGreaterThan(0);
    const stop = locale.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 5));
    expect(locale.get().source).toBe("navigator");
    stop();
  });
});

describe("preimage standalone", () => {
  it("getManager resolves null and submit throws HostUnavailableError", async () => {
    const preimage = createPreimageController(createHostController());
    await expect(preimage.getManager()).resolves.toBeNull();
    await expect(preimage.submit(new Uint8Array([1]))).rejects.toMatchObject({
      name: "HostUnavailableError",
    });
  });

  it("watch reports HostUnavailableError through onError and tears down safely", async () => {
    const preimage = createPreimageController(createHostController());
    const errors: unknown[] = [];
    const stop = preimage.watch("0x00", () => {}, { onError: (e) => errors.push(e) });
    await new Promise((r) => setTimeout(r, 10));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ name: "HostUnavailableError" });
    stop();
    stop();
  });
});

describe("chain config with hostChain roles", () => {
  const descriptor = {} as ChainDefinition;

  it("accepts a hostChain role without a genesisHash", () => {
    expect(() =>
      defineConfig({ chains: { hub: { descriptor, hostChain: "AssetHub" } } }),
    ).not.toThrow();
  });

  it("rejects a chain with neither genesisHash nor hostChain", () => {
    expect(() => defineConfig({ chains: { hub: { descriptor } } })).toThrow(/genesisHash/);
  });

  it("getGenesisHash returns the configured hash standalone, null when discovery-only", async () => {
    const host = createHostController();
    const chains = createChainController(
      defineConfig({
        chains: {
          pinned: { descriptor, genesisHash: "0x11", hostChain: "AssetHub" },
          discovered: { descriptor, hostChain: "People" },
        },
      }),
      host,
    );
    await expect(chains.getGenesisHash("pinned")).resolves.toBe("0x11");
    await expect(chains.getGenesisHash("discovered")).resolves.toBeNull();
    chains.destroy();
  });
});
