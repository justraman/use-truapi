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
  // Host connect resolves accounts through the product account derivation —
  // without this the host provider returns an empty account list.
  productAccount: { dotNsIdentifier: "use-truapi-example.dot" },
  statements: { appName: "use-truapi-example" },
});

declare module "@use-truapi/react" {
  interface Register {
    config: typeof config;
  }
}
