import { renderHook, waitFor } from "@testing-library/react";
import { createRuntime, defineConfig } from "@use-truapi/core";
import type { ChainDefinition } from "polkadot-api";
import { type ReactNode, createElement } from "react";
import { describe, expect, it } from "vitest";
import {
  TruapiProvider,
  useHostChainInfo,
  useHostConnectionStatus,
  useHostInfo,
  useLocale,
  usePreimage,
  useProductContext,
  useRingVrfKeys,
} from "../src/index";

const config = defineConfig({
  chains: { test: { descriptor: {} as ChainDefinition, hostChain: "AssetHub" } },
});

function wrapper({ children }: { children: ReactNode }) {
  return createElement(TruapiProvider, { runtime: createRuntime(config) }, children);
}

describe("host capability hooks standalone", () => {
  it("useLocale follows navigator.language", () => {
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.source).toBe("navigator");
    expect(result.current.languageTag).toBeTruthy();
  });

  it("useHostConnectionStatus is disconnected", async () => {
    const { result } = renderHook(() => useHostConnectionStatus(), { wrapper });
    await waitFor(() => expect(result.current).toBe("disconnected"));
  });

  it("useHostInfo / useProductContext / useHostChainInfo resolve null", async () => {
    const { result } = renderHook(
      () => ({
        info: useHostInfo(),
        context: useProductContext(),
        chains: useHostChainInfo(["AssetHub"]),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.info.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.context.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.chains.isSuccess).toBe(true));
    expect(result.current.info.data).toBeNull();
    expect(result.current.context.data).toBeNull();
    expect(result.current.chains.data).toBeNull();
  });

  it("usePreimage stays disabled without a key and errors standalone with one", async () => {
    const { result: disabled } = renderHook(() => usePreimage(undefined), { wrapper });
    expect(disabled.current.fetchStatus).toBe("idle");
    const { result } = renderHook(() => usePreimage("0x00"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.name).toBe("HostUnavailableError");
  });

  it("useRingVrfKeys errors with HostUnavailableError standalone", async () => {
    // Standalone the query errors immediately; disable TanStack's default
    // exponential retry so the assertion doesn't wait through three attempts.
    const { result } = renderHook(() => useRingVrfKeys(undefined, { query: { retry: false } }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.name).toBe("HostUnavailableError");
  });
});
