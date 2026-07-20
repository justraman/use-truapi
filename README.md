# use-truapi

**React hooks and Vue composables for building Polkadot apps.**

> **Status:** this is an experiment, not an official library. The effort will
> move into [@parity/product-sdk](https://github.com/paritytech/product-sdk),
> which is the right place for it to live long term.

One install, one provider, 51 hooks. `use-truapi` wraps the entire
[TruAPI](https://github.com/paritytech/truapi) /
[@parity/product-sdk](https://github.com/paritytech/product-sdk) surface —
chain queries, wallet accounts, transactions, contracts, chat, statement
store, payments, notifications and cloud storage — so your frontend never
imports (or even installs) the underlying SDK packages. Every hook is built
on [TanStack Query](https://tanstack.com/query), so you get caching,
`staleTime`/`gcTime` strategies, refetching, invalidation and devtools.

**Documentation:** [justraman.github.io/use-truapi](https://justraman.github.io/use-truapi/)

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
   and publishes all three packages to npm.

## License

MIT
