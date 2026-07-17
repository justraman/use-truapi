# use-truapi

**React hooks and Vue composables for building TruAPI products.**

One install, one provider, 51 hooks. `use-truapi` wraps the entire
[TruAPI](https://github.com/paritytech/truapi) /
[@parity/product-sdk](https://github.com/paritytech/product-sdk) surface —
chain queries, wallet accounts, transactions, contracts, chat, statement
store, payments, notifications and cloud storage — so your frontend never
imports (or even installs) the underlying SDK packages. Every hook is built
on [TanStack Query](https://tanstack.com/query), so you get caching,
`staleTime`/`gcTime` strategies, refetching, invalidation and devtools for
free.

```tsx
const { submit, phase } = useTx();
const balance = useBalance(account?.address);
const total = useChainQuery((api) => api.query.Balances.TotalIssuance.getValue(), [], {
  query: { staleTime: 60_000 }, // any TanStack Query option
});
const theme = useTheme();
```

| Package | Registry | What it is |
| --- | --- | --- |
| `@use-truapi/react` | npm | React 18/19 hooks |
| `@use-truapi/vue` | npm | Vue 3 composables |
| `@use-truapi/core` | npm | Framework-agnostic runtime both bind to |


## Why

Products that run inside Polkadot hosts (Desktop / Mobile / Web) talk to the
chain and the host through **TruAPI** — the host↔product wire protocol — via a
family of `@parity/product-sdk-*` packages: `host`, `chain-client`, `signer`,
`tx`, `contracts`, `statement-store`, `cloud-storage`, `address`, `utils`, …
Each has its own idioms (neverthrow `ResultAsync`, `Result` unions, thrown
error hierarchies, `HostSubscription`, PAPI Observables) and its own lifecycle
rules (promise caching with failure eviction, terminal `destroy()`,
subscriptions that must be re-armed on host interrupt).

`use-truapi` folds all of that into hooks with one consistent shape:

- **One dependency (plus TanStack Query).** The SDK packages are regular
  dependencies of `@use-truapi/core` — you never install or import them.
- **One async idiom: TanStack Query.** Every read is a `useQuery` result
  (`{ data, error, isPending, refetch, … }`), every action a mutation
  result with a named method (`{ connect, data, error, isPending, reset }`), and
  every hook accepts TanStack options (`staleTime`, `gcTime`, `enabled`,
  `retry`, …) via `query` / `mutation`. Live subscriptions are bridged into
  the query cache and shared per key across components.
- **Host *and* standalone.** Every hook degrades gracefully outside a host
  container (plain browser tab): dev accounts replace host wallets, WebSocket
  RPC replaces the host chain provider, `prefers-color-scheme` replaces the
  host theme, browser localStorage replaces host storage. You develop in a
  normal tab and ship the same code into Polkadot Desktop/Mobile/Web.

## Install

```bash
# React
npm i @use-truapi/react @tanstack/react-query   # or bun add / pnpm add / yarn add

# Vue
npm i @use-truapi/vue @tanstack/vue-query
```

TanStack Query v5 is a peer dependency — if your app already uses it, the
hooks share your existing `QueryClient` and show up in your devtools.

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

## TanStack Query integration

All read and subscription hooks are `useQuery` results; all action hooks are
`useMutation` results. That means the full TanStack toolbox applies.

**QueryClient.** `TruapiProvider` / `TruapiPlugin` reuses your app's
`QueryClient` when one is already provided (`QueryClientProvider` /
`VueQueryPlugin`), so all data shares one cache and one devtools panel.
Without one, it creates a client with use-truapi defaults
(`staleTime: 5_000` on queries — chain reads don't hammer the RPC on
remounts). Pass `queryClient` to the provider/plugin to override either way.

**Cache strategies per hook.** Every read hook takes `query`, every mutation
hook takes `mutation`, forwarded straight to TanStack:

```tsx
const balance = useBalance(address, { query: { gcTime: 300_000 } });
const spec = useChainSpec({ chain: "assetHub" });
const total = useChainQuery((api) => api.query.Balances.TotalIssuance.getValue(), [], {
  query: { staleTime: 60_000, refetchInterval: 120_000, placeholderData: (prev) => prev },
});
const publish = usePublishStatement({ mutation: { onSuccess: () => confetti() } });
```

**Query keys.** Every hook caches under a documented key from the exported
`queryKeys` factory, so you can prefetch, invalidate or read hook data from
anywhere:

```tsx
import { queryKeys } from "@use-truapi/react"; // or /vue
const queryClient = useQueryClient();

queryClient.invalidateQueries({ queryKey: queryKeys.balance("assetHub", address) });
queryClient.invalidateQueries({ queryKey: ["truapi", "balance", { chain: "assetHub" }] }); // partial
queryClient.invalidateQueries({ queryKey: queryKeys.root }); // everything use-truapi cached
const cached = queryClient.getQueryData(queryKeys.blockNumber("assetHub"));
```

The parameter object is always the last key element, so TanStack's partial
matching works on any subset of it. Keys always contain the *resolved* chain
key (your config's `defaultChain` when a hook omits `chain`).

**Live subscriptions.** Push-based hooks (`useBalance`, `useBlockNumber`,
`useChainSubscription`, `useStatements`, `useChatMessages`, `usePaymentBalance`,
…) keep their real-time behavior: one underlying host subscription per query
key (deduped across components), each value written into the cache via
`setQueryData` — visible in devtools and readable by anything else on the
same key. For these, `staleTime` defaults to `Infinity` and `retry`/window
refocus refetching are off (the subscription *is* the freshness mechanism).
If a subscription errors after delivering data, the result switches to the
error state but `data` retains the last value.

**Devtools.** Mount `@tanstack/react-query-devtools` /
`@tanstack/vue-query-devtools` as usual; every use-truapi query appears under
the `["truapi", …]` keys.

### Migrating from 0.1

- Reads: `isLoading` → `isPending` (initial load) / `isFetching`; `status`
  values are now TanStack's `pending | success | error`.
- Mutations: `run(...args)` → a named action per hook, e.g.
  `publish(data, options?)`, `upload(data, options?)`, `send(content, roomId?)`,
  `connect(provider?)`. Each returns a promise and the hook result keeps the
  mutation state (`data`, `error`, `isPending`, `reset`).
- `useTx` / `useBatchTx` keep `submit(build, options?)` and `phase`; `result`
  is now the mutation's `data`.
- List hooks (`useStatements`, `useChatMessages`, `useChatRooms`) return
  query results: `statements` → `data` (plus `clear()` where it existed).

## Hook catalog

Identical names in `@use-truapi/react` and `@use-truapi/vue` unless noted.
Shorthand in the tables: **query → T** is a TanStack `useQuery` result
(`data: T`, `error`, `isPending`, `refetch`, …); **live T** is the same shape
fed by a shared host subscription; **mutation → T** is a
mutation result with state fields (`data`, `error`, `isPending`, `reset`) and a
named action resolving to `T`.

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
| `useFeatureSupported(feature)` | query → `boolean` | e.g. `{ tag: "Chain", value: { genesisHash } }` |
| `useDeriveEntropy()` | mutation → `Uint8Array` | RFC-0007 wallet-bound deterministic entropy |
| `useNotifications()` | `{ push, cancel }` | RFC-0019 scheduled push notifications (host-only) |
| `useHostStorage<T>(key)` | query + `{ set, remove }` | host KV in-container, browser localStorage standalone; writes update the cache in place |

### Chain

| Hook | Returns | Notes |
| --- | --- | --- |
| `useChainClient({ chain? })` | query → `PolkadotClient` | raw PAPI client escape hatch |
| `useTypedApi({ chain? })` | query → typed api | descriptor-typed PAPI api |
| `useChainQuery(read, deps?, { chain?, query? })` | query | one-shot read: `useChainQuery((api) => api.query.X.Y.getValue(), [])`; `deps` are part of the query key |
| `useChainSubscription(select, deps?, { chain? })` | live data | any typed-api Observable (`watchValue`, events, …) |
| `useBlockNumber({ chain? })` | live `number` | best block |
| `useBalance(address, { chain? })` | live `{ free, reserved, frozen }` | planck bigints |
| `useChainSpec({ chain? })` | query | host-reported chain spec (null standalone) |

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
| `useUserId()` | query → `string \| null` | primary DotNS username |
| `useSignRaw()` | mutation → `Uint8Array` | |

### Transactions

| Hook | Returns | Notes |
| --- | --- | --- |
| `useTx({ chain? })` | mutation + `{ submit, phase }` | `phase`: `idle → signing → broadcasting → in-block → finalized \| error`. Handles `ChainSubmit` permission + connect automatically; the result is the mutation's `data` |
| `useBatchTx({ chain? })` | same | wraps calls in `Utility.batch_all` (or `batch` / `force_batch`) |

### Contracts (pallet-revive / Asset Hub)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useContract(cdmJson, library, { chain?, live? })` | query → contract handle | manifests from `@tambola/…`-style CDM packages; `live` resolves registry addresses |
| `useContractAt(address, abi, { chain? })` | query → contract handle | ad-hoc, no manifest |
| `useContractQuery(contract, method, args)` | query | dry-run read; errors on revert |
| `useContractTx(contract, method)` | mutation → `TxResult` | `send([...args])`; dry-run pre-flight, then sign & watch |
| `useEnsureAccountMapped(cdmJson)` | mutation | one-time pallet-revive account mapping |

### Chat (host-only)

| Hook | Returns |
| --- | --- |
| `useChatRoom({ roomId, name, icon })` | registration state (idempotent) |
| `useChatBot({ botId, name, icon })` | registration state |
| `useChatRooms()` | live room list |
| `useChatMessages(roomId, { limit? })` | live list of `MessagePosted` events + `clear` |
| `useChatActions(handler)` | raw action stream (messages, buttons, commands) |
| `useSendChatMessage(roomId?)` | mutation → `{ messageId }`; `send(content, roomId?)`, plain string content becomes a Text message |

### Statement store (ephemeral pub/sub)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useStatements<T>({ topic2?, limit? })` | live list + `clear` | empty & inert standalone |
| `usePublishStatement<T>()` | mutation → `boolean` | `publish(data, options?)`; JSON ≤ 512 bytes; `false` standalone |
| `useStatementChannel<T>({ topic2? })` | `{ values, write, ready }` | last-write-wins channels (presence, cursors) |

### Payments (RFC-0006, host-only)

| Hook | Returns |
| --- | --- |
| `usePaymentBalance({ purse? })` | live balance |
| `useRequestPayment()` | mutation → `{ id }`; `request(amount, destination, from?)` (host shows confirmation UI) |
| `useTopUp()` | mutation; `topUp(amount, source, into?)` |
| `usePaymentStatus(paymentId)` | live `Processing \| Completed \| Failed` |

### Cloud storage (Bulletin chain)

| Hook | Returns | Notes |
| --- | --- | --- |
| `useUpload()` | mutation → `StoreResult` | `upload(data, options?)`; chunking + CID handled for you; needs `cloudStorage: { environment }` in config |
| `useCid(cid, { json? })` | query → bytes or parsed JSON | host preimage lookup |
| `useStorageAuthorization(address?)` | query → quota status | |

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
@use-truapi/react     @use-truapi/vue     ← thin bindings over TanStack Query (+ stores/refs)
   @tanstack/react-query  @tanstack/vue-query
        └──────────┬──────────┘
           @use-truapi/core               ← runtime: stores, query keys, live registry, lifecycles
        ┌──────────┴───────────┐
  @parity/product-sdk-*   polkadot-api    ← host getters, SignerManager, submitAndWatch, PAPI
        └──────────┬──────────┘
             @parity/truapi               ← TruAPI wire protocol (SCALE over postMessage)
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
- every host subscription wrapped with `unsubscribe` + `onInterrupt` handling;
- a refcounted live-subscription registry per QueryClient, so N components on
  the same query key share one host subscription feeding the query cache.

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
