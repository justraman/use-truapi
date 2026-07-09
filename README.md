# use-truapi

**React hooks and Vue composables for building Polkadot host products.**

One install, one provider, ~40 hooks. `use-truapi` wraps the entire
[TrUAPI](https://github.com/paritytech/truapi) /
[@parity/product-sdk](https://github.com/paritytech/product-sdk) surface —
chain queries, wallet accounts, transactions, contracts, chat, statement
store, payments, notifications and cloud storage — so your frontend never
imports (or even installs) the underlying SDK packages.

```tsx
const { submit, phase } = useTx();
const balance = useBalance(account?.address);
const theme = useTheme();
```

| Package | Registry | What it is |
| --- | --- | --- |
| `@use-truapi/react` | npm | React 18/19 hooks |
| `@use-truapi/vue` | npm | Vue 3 composables |
| `@use-truapi/core` | npm | Framework-agnostic runtime both bind to |

Where this is heading: see the [roadmap](./ROADMAP.md).

## Why

Products that run inside Polkadot hosts (Desktop / Mobile / Web) talk to the
chain and the host through **TrUAPI** — the host↔product wire protocol — via a
family of `@parity/product-sdk-*` packages: `host`, `chain-client`, `signer`,
`tx`, `contracts`, `statement-store`, `cloud-storage`, `address`, `utils`, …
Each has its own idioms (neverthrow `ResultAsync`, `Result` unions, thrown
error hierarchies, `HostSubscription`, PAPI Observables) and its own lifecycle
rules (promise caching with failure eviction, terminal `destroy()`,
subscriptions that must be re-armed on host interrupt).

`use-truapi` folds all of that into hooks with one consistent shape:

- **One dependency.** The SDK packages are regular dependencies of
  `@use-truapi/core` — you never install or import them.
- **One async idiom.** Every read is `{ data, error, status, isLoading }`;
  every mutation is `{ run, data, error, isPending, reset }`; every
  subscription cleans itself up on unmount.
- **Host *and* standalone.** Every hook degrades gracefully outside a host
  container (plain browser tab): dev accounts replace host wallets, WebSocket
  RPC replaces the host chain provider, `prefers-color-scheme` replaces the
  host theme, browser localStorage replaces host storage. You develop in a
  normal tab and ship the same code into Polkadot Desktop/Mobile/Web.

## Install

```bash
# React
npm i @use-truapi/react        # or bun add / pnpm add / yarn add

# Vue
npm i @use-truapi/vue
```

You'll also want PAPI descriptors for the chains you use — either generate
them (`npx papi add`) or use the prebuilt ones:

```bash
npm i @parity/product-sdk-descriptors
```

## Quick start — React

```tsx
// config.ts
import { defineConfig } from "@use-truapi/react";
import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";

export const config = defineConfig({
  chains: {
    assetHub: {
      descriptor: paseo_asset_hub,
      genesisHash: "0x…", // the chain's genesis hash
      wsUrls: ["wss://asset-hub-paseo.rpc…"], // used only outside a host
    },
  },
  dappName: "my-product",
  productAccount: { dotNsIdentifier: "my-product.dot" }, // app-scoped account
  statements: { appName: "my-product" },
});

// Register the config type once → every hook gets typed chain keys
declare module "@use-truapi/react" {
  interface Register {
    config: typeof config;
  }
}
```

```tsx
// main.tsx
import { TruapiProvider } from "@use-truapi/react";
import { config } from "./config";

root.render(
  <TruapiProvider config={config}>
    <App />
  </TruapiProvider>,
);
```

```tsx
// App.tsx
import {
  useAccounts,
  useBalance,
  useBlockNumber,
  useFormattedBalance,
  useTx,
} from "@use-truapi/react";

export function App() {
  const { selectedAccount, isConnected, connect } = useAccounts();
  const block = useBlockNumber();
  const balance = useBalance(selectedAccount?.address);
  const formatted = useFormattedBalance(balance.data?.free, { decimals: 10, symbol: "PAS" });
  const { submit, phase } = useTx();

  if (!isConnected) return <button onClick={() => connect()}>Connect</button>;

  return (
    <>
      <p>#{block.data} — {formatted}</p>
      <button
        disabled={phase !== "idle" && phase !== "finalized" && phase !== "error"}
        onClick={() =>
          submit((api) =>
            api.tx.Balances.transfer_keep_alive({ dest: DEST, value: 10_000_000_000n }),
          )
        }
      >
        {phase === "idle" ? "Send" : phase}
      </button>
    </>
  );
}
```

## Quick start — Vue

```ts
// main.ts
import { createApp } from "vue";
import { TruapiPlugin, defineConfig } from "@use-truapi/vue";
import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";

const config = defineConfig({
  chains: {
    assetHub: { descriptor: paseo_asset_hub, genesisHash: "0x…", wsUrls: ["wss://…"] },
  },
  dappName: "my-product",
});

declare module "@use-truapi/vue" {
  interface Register {
    config: typeof config;
  }
}

createApp(App).use(TruapiPlugin, { config }).mount("#app");
```

```vue
<script setup lang="ts">
import { useAccounts, useBalance, useBlockNumber, useFormattedBalance } from "@use-truapi/vue";

const { selectedAccount, isConnected, connect } = useAccounts();
const block = useBlockNumber();
const balance = useBalance(() => selectedAccount.value?.address);
const formatted = useFormattedBalance(() => balance.data.value?.free, {
  decimals: 10,
  symbol: "PAS",
});
</script>

<template>
  <button v-if="!isConnected" @click="connect()">Connect</button>
  <p v-else>#{{ block.data }} — {{ formatted }}</p>
</template>
```

Vue composables accept plain values **or getters** (`() => value`) wherever an
argument can change — pass a getter to make the composable reactive to it.

## Hook catalog

Identical names in `@use-truapi/react` and `@use-truapi/vue` unless noted.

### Host & environment

| Hook | Returns | Notes |
| --- | --- | --- |
| `useHostMode()` | `"unknown" \| "host" \| "standalone"` | async detection, memoized |
| `useIsHost()` | `boolean` | convenience over `useHostMode` |
| `useTheme()` | `{ variant, custom, source }` | host theme, or `prefers-color-scheme` standalone |
| `usePermission()` | mutation → `boolean` | RFC-0002 remote permissions (`ChainSubmit`, `Remote{domains}`, …) |
| `useDevicePermission()` | mutation → `boolean` | Camera, Notifications, Clipboard, … |
| `useResourceAllocation()` | mutation | RFC-0010 allowances — one prompt covers later calls |
| `useHostNavigate()` | `(url) => Promise<void>` | `.dot` deep links in-container, `https://` external |
| `useFeatureSupported(feature)` | data → `boolean` | e.g. `{ tag: "Chain", value: { genesisHash } }` |
| `useDeriveEntropy()` | mutation → `Uint8Array` | RFC-0007 wallet-bound deterministic entropy |
| `useNotifications()` | `{ push, cancel }` | RFC-0019 scheduled push notifications (host-only) |
| `useHostStorage<T>(key)` | data + `{ set, remove }` | host KV in-container, browser localStorage standalone |

### Chain

| Hook | Returns | Notes |
| --- | --- | --- |
| `useChainClient({ chain? })` | data → `PolkadotClient` | raw PAPI client escape hatch |
| `useTypedApi({ chain? })` | data → typed api | descriptor-typed PAPI api |
| `useChainQuery(read, deps?, { chain? })` | data | one-shot read: `useChainQuery((api) => api.query.X.Y.getValue(), [])` |
| `useChainSubscription(select, deps?, { chain? })` | live data | any typed-api Observable (`watchValue`, events, …) |
| `useBlockNumber({ chain? })` | live `number` | best block |
| `useBalance(address, { chain? })` | live `{ free, reserved, frozen }` | planck bigints |
| `useChainSpec({ chain? })` | data | host-reported chain spec (null standalone) |

Every chain hook takes an optional `chain` key from your config; omitted, it
uses `defaultChain` (or the first configured chain).

### Accounts & signing

| Hook | Returns | Notes |
| --- | --- | --- |
| `useAccounts()` | `{ accounts, selectedAccount, status, connect, disconnect, select, … }` | host wallet in-container, Alice…Ferdie dev accounts standalone |
| `useSelectedAccount()` | `SignerAccount \| null` | |
| `useConnect()` / `useDisconnect()` | mutation / `() => void` | connect is shared & failure-retryable |
| `useSigner()` | `PolkadotSigner \| null` | for advanced PAPI use |
| `useLogin()` | mutation → `"Success" \| "AlreadyConnected" \| "Rejected"` | RFC-0009 — call from a user gesture |
| `useUserId()` | data → `string \| null` | primary DotNS username |
| `useSignRaw()` | mutation → `Uint8Array` | |

### Transactions

| Hook | Returns | Notes |
| --- | --- | --- |
| `useTx({ chain? })` | `{ submit, phase, result, error, isPending, reset }` | `phase`: `idle → signing → broadcasting → in-block → finalized \| error`. Handles `ChainSubmit` permission + connect automatically |
| `useBatchTx({ chain? })` | same | wraps calls in `Utility.batch_all` (or `batch` / `force_batch`) |

### Contracts (pallet-revive / Asset Hub)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useContract(cdmJson, library, { chain?, live? })` | data → contract handle | manifests from `@tambola/…`-style CDM packages; `live` resolves registry addresses |
| `useContractAt(address, abi, { chain? })` | data → contract handle | ad-hoc, no manifest |
| `useContractQuery(contract, method, args)` | data | dry-run read; throws on revert |
| `useContractTx(contract, method)` | mutation → `TxResult` | dry-run pre-flight, then sign & watch |
| `useEnsureAccountMapped(cdmJson)` | mutation | one-time pallet-revive account mapping |

### Chat (host-only)

| Hook | Returns |
| --- | --- |
| `useChatRoom({ roomId, name, icon })` | registration state (idempotent) |
| `useChatBot({ botId, name, icon })` | registration state |
| `useChatRooms()` | live room list |
| `useChatMessages(roomId, { limit? })` | accumulated `MessagePosted` events |
| `useChatActions(handler)` | raw action stream (messages, buttons, commands) |
| `useSendChatMessage(roomId?)` | mutation; plain strings become Text messages |

### Statement store (ephemeral pub/sub)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useStatements<T>({ topic2?, limit? })` | live statement list | empty & inert standalone |
| `usePublishStatement<T>()` | mutation → `boolean` | JSON ≤ 512 bytes; `false` standalone |
| `useStatementChannel<T>({ topic2? })` | `{ values, write, ready }` | last-write-wins channels (presence, cursors) |

### Payments (RFC-0006, host-only)

| Hook | Returns |
| --- | --- |
| `usePaymentBalance({ purse? })` | live balance |
| `useRequestPayment()` | mutation → `{ id }` (host shows confirmation UI) |
| `useTopUp()` | mutation |
| `usePaymentStatus(paymentId)` | live `Processing \| Completed \| Failed` |

### Cloud storage (Bulletin chain)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useUpload()` | mutation → `StoreResult` | chunking + CID handled for you; needs `cloudStorage: { environment }` in config |
| `useCid(cid, { json? })` | data → bytes or parsed JSON | host preimage lookup |
| `useStorageAuthorization(address?)` | data → quota status | |

### Formatting & addresses

`useFormattedBalance(planck, { decimals, symbol, … })`, plus plain re-exported
functions (not hooks): `formatBalance`, `formatPlanck`, `parseToPlanck`,
`truncateAddress`, `ss58Encode`, `ss58ToH160`, `h160ToSs58`, `toGenericSs58`,
`addressesEqual`.

### Escape hatches

`useRuntime()` returns the full core runtime (`runtime.chains.getClient()`,
`runtime.accounts.manager`, `runtime.statements.getClient()`, …) when you need
something the hooks don't cover. Error classes (`HostUnavailableError`,
`ChainNotSupportedError`, `TxDispatchError`, `ContractRevertedError`, …) are
re-exported for `instanceof` branching.

## Host vs standalone behavior

| Capability | Inside a Polkadot host | Standalone (plain browser) |
| --- | --- | --- |
| Chain connection | host provider (host owns the socket) | `wsUrls` from your config |
| Accounts | host wallet / product account | Alice…Ferdie dev accounts |
| Signing permission | `ChainSubmit` requested per tx | no-op |
| Theme | host theme subscription | `prefers-color-scheme` |
| KV storage | host localStorage | browser localStorage |
| Chat / payments / notifications / cloud reads | native | unavailable — hooks error or stay inert (documented per hook) |
| Statements | sponsored (RFC-0010) publish/subscribe | inert (`publish` → `false`, lists stay empty) |

The rule of thumb: **read-style hooks degrade silently, action-style hooks
throw `HostUnavailableError`** so you can gate UI with `useIsHost()`.

## Architecture

```
@use-truapi/react     @use-truapi/vue     ← thin bindings (useSyncExternalStore / refs)
        └──────────┬──────────┘
           @use-truapi/core               ← runtime: stores, caches, lifecycles, error normalization
        ┌──────────┴───────────┐
  @parity/product-sdk-*   polkadot-api    ← host getters, SignerManager, submitAndWatch, PAPI
        └──────────┬──────────┘
             @parity/truapi               ← TrUAPI wire protocol (SCALE over postMessage)
                   │
        Polkadot host (Desktop / Mobile / Web)
```

`@use-truapi/core` owns everything stateful so the framework packages stay
tiny and identical in behavior:

- host detection memoized once per page;
- one PAPI client per configured chain (promise-cached, failure-evicting,
  15 s host-provider timeout);
- one `SignerManager` bridged into a subscribable store;
- lazy, connect-once chat / statement / payment / storage clients;
- every host subscription wrapped with `unsubscribe` + `onInterrupt` handling.

## Developing this repo

```bash
bun install

bunx nx run-many -t build        # build core → react/vue (cached, ordered)
bunx nx run-many -t test         # vitest everywhere
bunx nx run-many -t typecheck    # tsc --noEmit
bunx nx run-many -t lint         # biome

bun run --cwd apps/example-react dev   # standalone example on :5173
bun run --cwd apps/example-vue dev     # standalone example on :5174

cd e2e && bunx playwright test   # runs example-react inside a real Spektr test host
```

The e2e suite uses
[`@parity/host-api-test-sdk`](https://www.npmjs.com/package/@parity/host-api-test-sdk) —
a real host implementation with dev accounts, permission/signing logs and
theme control — so hooks are exercised against the actual wire protocol, not
mocks.

## Releasing

1. Bump the version in `packages/{core,react,vue}/package.json` (keep them in
   lockstep).
2. Commit, tag `vX.Y.Z`, push the tag.
3. The `release.yml` workflow verifies tag == package versions, builds, tests,
   and publishes all three packages to npm with provenance.

Requires an `NPM_TOKEN` secret (automation token for the `use-truapi` npm org)
in the repository's `npm` environment.

## License

MIT
