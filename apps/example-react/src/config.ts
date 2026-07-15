import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";
import { defineConfig } from "@use-truapi/react";

export const config = defineConfig({
  chains: {
    assetHub: {
      descriptor: paseo_asset_hub,
      genesisHash: "0xbf0488dbe9daa1de1c08c5f743e26fdc2a4ecd74cf87dd1b4b1eeb99ae4ef19f",
      wsUrls: ["wss://paseo-asset-hub-next-rpc.polkadot.io"],
    },
  },
  dappName: "use-truapi-example",
  // Optional (dappName alone derives account 0); pinned here because the e2e
  // fixture maps "use-truapi-example.dot/0" to a funded dev account.
  productAccount: { dotNsIdentifier: "use-truapi-example.dot" },
  statements: { appName: "use-truapi-example" },
  cloudStorage: { environment: "paseo" },
});

declare module "@use-truapi/react" {
  interface Register {
    config: typeof config;
  }
}
