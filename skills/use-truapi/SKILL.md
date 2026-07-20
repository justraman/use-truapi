---
name: use-truapi
description: >-
  Build Polkadot app frontends with use-truapi — React hooks (@use-truapi/react)
  and Vue composables (@use-truapi/vue) for chain queries, wallet accounts,
  transactions, PolkaVM contracts, host features (theme, permissions,
  notifications), chat, statements, payments and cloud storage, all built on
  TanStack Query. Use this skill whenever writing or reviewing code that
  imports @use-truapi/*, whenever a React or Vue Polkadot dapp needs wallet
  connection, balances, transaction submission, contract calls, or Polkadot
  host (Desktop/Mobile) integration, or when the user mentions use-truapi,
  TruapiProvider, useTx, useChainQuery or similar hooks — even if they don't
  name the library explicitly.
---

# use-truapi

React hooks / Vue composables wrapping the whole TruAPI + @parity/product-sdk
surface. Apps import **only** `@use-truapi/react` or `@use-truapi/vue` — never
the underlying SDK packages (chain descriptors are the one exception). Every
read is a TanStack Query v5 query; every action is a mutation.
Docs: https://justraman.github.io/use-truapi/

```bash
npm i @use-truapi/react @tanstack/react-query polkadot-api   # React
npm i @use-truapi/vue @tanstack/vue-query polkadot-api       # Vue
```

Chain descriptors: generate with `npx papi add`, or prebuilt
`@parity/product-sdk-descriptors` (e.g. `.../paseo-asset-hub`).
Call-parameter enums like `MultiAddress` come from the same source —
`@polkadot-api/descriptors` when generated, or the chain entrypoint
(`@parity/product-sdk-descriptors/paseo-asset-hub`) when prebuilt.
`Binary` comes from `polkadot-api`.

## Setup (once per app)

```ts
// config.ts
import { paseo_asset_hub } from "@parity/product-sdk-descriptors/paseo-asset-hub";
import { defineConfig } from "@use-truapi/react"; // or "@use-truapi/vue"

export const config = defineConfig({
  chains: {
    assetHub: {                       // key becomes the typed ChainKey
      descriptor: paseo_asset_hub,
      genesisHash: "0xbf04…f19f",
      wsUrls: ["wss://…"],            // used only standalone (no host)
    },
  },
  dappName: "my-app",
  statements: { appName: "my-app" },       // only if using statement hooks
  cloudStorage: { environment: "paseo" },  // only if using storage hooks
});

// Register once → every hook gets typed chain keys + typed PAPI apis
declare module "@use-truapi/react" {
  interface Register { config: typeof config }
}
```

```tsx
// React: wrap the app. Reuses your QueryClient if TruapiProvider is rendered
// inside an existing QueryClientProvider; otherwise creates one (5s staleTime).
<TruapiProvider config={config}><App /></TruapiProvider>
// Vue: createApp(App).use(TruapiPlugin, { config })
```

Default chain: `defaultChain` config key, else the first key in `chains`.
Every chain-aware hook accepts `{ chain: "key" }` to target another.

## Hook shapes

- **Reads** return TanStack query state: `{ data, error, isPending, refetch }`.
  Pass query options via `query`: `useBalance(addr, { query: { staleTime: 60_000 } })`.
- **Actions** return a named method + mutation state: `{ connect|submit|upload|publish…,
  data, error, isPending, reset }`. Method returns a promise. Callbacks via
  `mutation`: `useLogin({ mutation: { onSuccess } })`.
- Live reads (balance, block number, subscriptions, message lists) share one
  host/socket subscription per query key across all mounted components.

## Vue differences

Same API from `@use-truapi/vue`, except: reactive inputs are **per-field
getters** — positional args, dep entries and most option fields accept
`value | (() => value)` (`useBalance(() => props.address)`); whole-object
getters are not supported. Returned state is refs (`balance.value?.free`).
Option fields without getter support are captured once — remount with `:key`
to change them (e.g. `useStatementChannel`'s `topic2`). Use `TruapiPlugin`
instead of a provider. Reference files below show React only — translate
mechanically.

## Host vs standalone

Detected at runtime. Host = embedded in a Polkadot app (Desktop/Mobile):
chain sockets, signing, theme, chat, statements, payments, notifications come
from the host. Standalone = plain browser tab: chains use `wsUrls`, signing
uses built-in dev accounts (Alice…Ferdie), theme follows
`prefers-color-scheme`, KV storage falls back to localStorage.

Rule of thumb: **read-style hooks degrade silently standalone; action-style
host features throw `HostUnavailableError`** (chat, payments, notifications).
Statements stay inert (`publish` → `false`, lists empty). Gate host-only UI
with `useIsHost()` / `useHostMode()`.

## Hook index

Read the listed reference file before writing code with these hooks — exact
signatures, options, return fields and gotchas live there.

**Chain** → [references/chain.md](references/chain.md)
`useChainClient` raw PAPI client · `useTypedApi` descriptor-typed api ·
`useChainQuery` one-shot cached read · `useChainSubscription` shared live
observable · `useBlockNumber` · `useBalance` live native balance (planck) ·
`useChainSpec` name/properties.

**Accounts & tx** → [references/accounts-tx.md](references/accounts-tx.md)
`useAccounts` wallet state + connect/disconnect/select · `useSelectedAccount` ·
`useConnect` · `useDisconnect` · `useSigner` PolkadotSigner · `useLogin`
RFC-0009 host login · `useUserId` DotNS username · `useSignRaw` sign bytes ·
`useTx` sign/submit/watch · `useBatchTx` atomic `Utility.batch_all`.

**Contracts (PolkaVM)** → [references/contracts.md](references/contracts.md)
`useContract` typed handle from cdm.json · `useContractAt` ad-hoc from
address+ABI · `useContractQuery` dry-run read · `useContractTx` write with
pre-flight · `useEnsureAccountMapped` required once before contract txs.

**Host** → [references/host.md](references/host.md)
`useHostMode` "unknown"|"host"|"standalone" · `useIsHost` · `useTheme` ·
`usePermission` RFC-0002 · `useDevicePermission` camera/notifications ·
`useResourceAllocation` RFC-0010 allowances · `useHostNavigate` .dot/https
deep links · `useFeatureSupported` · `useDeriveEntropy` stable 32-byte
secrets (RFC-0007) · `useNotifications` push (RFC-0019) · `useHostStorage`
product-scoped KV JSON.

**Chat & statements** → [references/chat-statements.md](references/chat-statements.md)
`useChatRoom` register room · `useChatBot` bot identity · `useChatRooms` ·
`useChatMessages` bounded live list · `useChatActions` raw action stream ·
`useSendChatMessage` · `useStatements` live app-topic list ·
`usePublishStatement` small JSON pub · `useStatementChannel` last-write-wins
presence/cursors.

**Payments, storage, formatting** → [references/payments-storage.md](references/payments-storage.md)
`usePaymentBalance` RFC-0006 purse · `useRequestPayment` host-confirmed pay ·
`useTopUp` fund purse · `usePaymentStatus` track to terminal state ·
`useUpload` bytes → CID (Bulletin) · `useCid` fetch CID bytes/JSON ·
`useStorageAuthorization` quota · `useFormattedBalance` planck → display
string.

## Errors

All importable from the framework package. `TxResult` dispatch failures are
**data** (`result.ok === false`, `result.dispatchError`), not throws.

- `HostError` base → `HostUnavailableError` (not in a host — the common local-dev
  case), `ChainNotSupportedError` (host lacks the chain / genesis drift).
- `TxError` base → `TxSigningRejectedError` (user declined),
  `TxDispatchError` (included on-chain but dispatch failed).
- `ContractError` base → `ContractRevertedError` (REVERT flag on ok dispatch).

## Utilities & escape hatch

Re-exported from the framework package: `defineConfig`, `createRuntime`,
`createTruapiQueryClient`, `queryKeys`/`toKeyPart` (cache invalidation),
`formatBalance`/`formatPlanck`/`parseToPlanck` (planck ↔ display),
`truncateAddress`, `ss58Encode`, `ss58ToH160`, `h160ToSs58`, `toGenericSs58`,
`addressesEqual`.

`useRuntime()` returns the runtime when no hook covers a need — controllers:
`runtime.chains|accounts|tx|contracts|chat|statements|payments|cloudStorage|host|config`.
