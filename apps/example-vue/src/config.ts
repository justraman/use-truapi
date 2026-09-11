import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";
import { defineConfig } from "@use-truapi/vue";

// Standalone endpoints and the Bulletin environment follow the test network the
// app is pointed at (`VITE_TRUAPI_NETWORK=previewnet`, default paseo). Inside a
// host the chain itself is discovered from the host, whatever this says.
const network = import.meta.env.VITE_TRUAPI_NETWORK === "previewnet" ? "previewnet" : "paseo";

export const config = defineConfig({
  chains: {
    assetHub: {
      // Paseo Next and previewnet run the same Asset Hub runtime family, so
      // one descriptor types both for this example.
      descriptor: paseo_asset_hub,
      // RFC-0026: inside a host the genesis hash is discovered by role, so a
      // testnet reset never strands the app. The descriptor's own genesis is
      // the fallback for hosts that predate discovery.
      hostChain: "AssetHub",
      genesisHash: paseo_asset_hub.genesis as `0x${string}`,
      wsUrls:
        network === "previewnet"
          ? ["wss://previewnet.substrate.dev/asset-hub"]
          : ["wss://paseo-asset-hub-next-rpc.polkadot.io"],
    },
  },
  dappName: "use-truapi-example",
  // No `productAccount`: the runtime derives the account from the host's
  // product context (`localhost:3000` under `truapi-host dev`) and falls back
  // to `use-truapi-example.dot` on hosts that predate it — the id the e2e
  // fixture maps to a funded dev account.
  statements: { appName: "use-truapi-example" },
  cloudStorage: { environment: network },
});

declare module "@use-truapi/vue" {
  interface Register {
    config: typeof config;
  }
}
