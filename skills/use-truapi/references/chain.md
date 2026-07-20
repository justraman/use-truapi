# Chain hooks

Connecting to configured chains and reading/watching their state. All hooks accept `{ chain?: ChainKey }` to target a non-default chain (`{ chain: "people" }`); callbacks and results are then typed against that chain's descriptor. One client connection per chain, created lazily and shared by every hook.

## useChainClient

`useChainClient(options?: { chain?, query? }) → UseQueryResult<PolkadotClient, Error>`

- Raw PAPI client: escape hatch for block observables (`bestBlocks$`), `getFinalizedBlock()`, submitting pre-signed extrinsics. Prefer `useTypedApi` / `useChainQuery` / `useChainSubscription` for typed work.
- Failed connections are dropped, so the next consumer retries.
- Host: provider requested from host by the chain's `genesisHash` (times out after `hostProviderTimeoutMs`, default 15000). Standalone: WebSocket via configured `wsUrls`; a chain without `wsUrls` throws.

## useTypedApi

`useTypedApi(options?: { chain?, query? }) → UseQueryResult<TypedApi, Error>`

- The typed PAPI api: `api.query` / `api.tx` / `api.constants` / `api.event` / `api.apis`.
- Only needed for imperative calls (event handlers, helpers, runtime-api calls); the `build`/`read`/`select` callbacks of `useTx`, `useChainQuery`, `useChainSubscription` already receive it.
- For renderable values, wrap the read in `useChainQuery` instead of awaiting the api yourself.

## useChainQuery

`useChainQuery(read: (api) => Promise<T>, deps: readonly unknown[], options?: { chain?, enabled?, query? }) → UseQueryResult<T, Error>`

- One-shot read; `deps` are part of the cache key — change a dep and it re-runs and caches separately. Same `(chain, deps)` across components shares one result. Deps are serialized bigint-safely.
- Does NOT update on new blocks; call `refetch()` to refresh, or use `useChainSubscription` for live values.
- While `enabled: false`, nothing fetches and the result stays pending — no need to guard the callback against missing inputs.

```tsx
import { useChainQuery } from "@use-truapi/react";

const { data, isPending, error } = useChainQuery(
  (api) => api.query.System.Account.getValue(address!),
  [address],
  { enabled: address !== undefined },
);
// no inputs: empty deps, cached once per chain
const total = useChainQuery((api) => api.query.Balances.TotalIssuance.getValue(), []);
```

## useChainSubscription

`useChainSubscription(select: (api, client) => { subscribe }, deps: readonly unknown[], options?: { chain?, enabled?, query? }) → UseQueryResult<T, Error>`

- Live counterpart of `useChainQuery`: `select` returns anything with `subscribe(observer)` (storage `watchValue()`, event streams, client observables). Latest value surfaces as `data`; pushed, never polled, nothing to refetch.
- One shared subscription per `(chain, deps)`; dropped when the last consumer unmounts. Anything the observable closes over belongs in `deps`.
- On stream error the result flips to error state but keeps the last `data`. `enabled: false` detaches.
- `select` also gets the raw `PolkadotClient`; give client-stream subscriptions a distinguishing dep (a string label) so they don't collide with other empty-deps subscriptions on the same chain.

```tsx
import { useChainSubscription } from "@use-truapi/react";

const { data: account } = useChainSubscription(
  (api) => api.query.System.Account.watchValue(address, { at: "best" }),
  [address],
  { enabled: address !== undefined },
);
const { data: finalized } = useChainSubscription(
  (_api, client) => client.finalizedBlock$,
  ["finalizedBlock"],
);
```

## useBlockNumber

`useBlockNumber(options?: { chain?, enabled?, query? }) → UseQueryResult<number, Error>`

- Best-block number, live; one shared block subscription per chain.
- Doubles as a per-block re-render tick. `enabled: false` detaches without unmounting (hidden-but-alive views).

## useBalance

`useBalance(address: string | undefined, options?: { chain?, query? }) → UseQueryResult<AccountBalance, Error>`

- `data` is `AccountBalance`: `free`, `reserved`, `frozen` as `bigint` planck, updated as blocks arrive.
- Auto-disabled while `address` is `undefined` — pass `account?.address` unguarded. One shared subscription per `(chain, address)`.
- Pair with `useFormattedBalance(balance?.free, { decimals, symbol })` for display. Feed decimals/symbol from `useChainSpec` when in a host, but keep hard-coded fallbacks — `useChainSpec` is `null` standalone.

## useChainSpec

`useChainSpec(options?: { chain? }) → UseQueryResult<ChainSpec | null, Error>`

- `ChainSpec`: `name`, `properties` (`ss58Format`, `tokenDecimals`, `tokenSymbol`, chain-specific extras; `null` if the host's JSON couldn't parse), and raw JSON in `propertiesRaw`.
- Host-only: standalone it resolves to `null` (no error) — guard on `data` before rendering. Fetched once per chain; never changes at runtime.
