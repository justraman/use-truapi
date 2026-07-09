import type { ChainDefinition } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { defineConfig } from "../src/config";
import { createHostController } from "../src/host";
import { createStatementsController } from "../src/statements";

const config = defineConfig({
  chains: { test: { descriptor: {} as ChainDefinition, genesisHash: "0x11" as `0x${string}` } },
  statements: { appName: "test-app" },
});

describe("statements standalone degradation", () => {
  it("getClient resolves null", async () => {
    const statements = createStatementsController(config, createHostController());
    await expect(statements.getClient()).resolves.toBeNull();
  });

  it("publish resolves false instead of throwing", async () => {
    const statements = createStatementsController(config, createHostController());
    await expect(statements.publish({ hello: "world" })).resolves.toBe(false);
  });

  it("subscribe is inert and unsubscribe safe", async () => {
    const statements = createStatementsController(config, createHostController());
    const stop = statements.subscribe(() => {
      throw new Error("must not fire standalone");
    });
    await new Promise((r) => setTimeout(r, 10));
    stop();
  });

  it("channel store resolves null", async () => {
    const statements = createStatementsController(config, createHostController());
    await expect(statements.getChannelStore()).resolves.toBeNull();
  });
});
