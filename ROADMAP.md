# Roadmap

Where `use-truapi` is today and where it's going. Checkboxes are the working
TODO list; milestones are intent, not promises — the protocol underneath
(TrUAPI / `@parity/product-sdk`) is explicitly a prototype and we track it.

## Status — v0.1 (current)

Shipped: `@use-truapi/core` + `@use-truapi/react` + `@use-truapi/vue` with ~40
hooks/composables covering host detection, theme, permissions, storage,
notifications, chain queries/subscriptions, accounts + RFC-0009 login, tx +
batch lifecycles, pallet-revive contracts, chat, statement store, RFC-0006
payments and Bulletin cloud storage. 36 core unit tests, 11 React + 6 Vue hook
tests, 3 Playwright e2e tests against a real `@parity/host-api-test-sdk` host,
CI + tag-triggered npm release with provenance.

## Launch checklist (manual, blocking the first publish)

- [ ] Create the `use-truapi` npm org (free) and an automation token
- [ ] Create the GitHub repo (`use-truapi/use-truapi` or adjust `repository`
      fields in `packages/*/package.json`) and push `main`
- [ ] Add the `NPM_TOKEN` secret to a repo environment named `npm`
- [ ] Tag `v0.1.0` → verify the release workflow publishes all three packages
- [ ] Turn on branch protection for `main` with the `Build, typecheck, lint, test`
      job as a required check (leave `E2E` advisory for now)

## v0.2 — Fill the surface gaps

Capabilities that exist in the SDK but have no hook yet, plus DX debt found
while building v0.1.

- [x] **TanStack Query rebuild** — every read/subscription hook is a
      `useQuery` result and every action a `useMutation` (peer dep on
      `@tanstack/react-query` / `@tanstack/vue-query` v5). Consumers get cache
      strategies (`staleTime`, `gcTime`, `refetchInterval`, …) via a
      `query`/`mutation` passthrough on every hook, documented `queryKeys` for
      invalidation/prefetching, devtools visibility, and QueryClient reuse
      when the app already provides one. Breaking: `run` → `mutate`,
      `isLoading` → `isPending`, list hooks return `data` (see README
      migration notes)
- [ ] **Preimage hooks** — `usePreimage(key)` (host lookup subscription) and
      `useSubmitPreimage()`; the only truapi namespace with no coverage today
- [ ] **Keys hooks** — expose `@parity/product-sdk-keys`: `useKeyManager()`
      (HKDF from a wallet signature), `useSessionKeys()` backed by host storage
- [ ] **Account persistence** — wire SignerManager's `persistence` option so the
      selected account survives reloads (host localStorage in-container)
- [ ] **Typed contracts** — document/integrate `generateContractTypes` codegen so
      `useContract` returns fully-typed method handles instead of `ContractDef`
- [ ] **Statement store BYOD** — accept `mode: "local"` credentials and a custom
      `StatementTransport` in `TruapiConfig.statements` so statements can work
      standalone (today: host-only, silently inert)
- [ ] **Cloud storage BYOD** — support `CloudStorageClient.from(...)` and expose
      upload progress as hook state, not just a callback
- [ ] **Auto re-subscribe on host interrupt** — theme already falls back; chat,
      payments and statement subscriptions currently just surface the error.
      Add bounded retry with backoff (reuse `withRetry` from product-sdk-tx)
- [x] **Query dedup** — shipped with the TanStack Query rebuild: reads dedupe
      through the query cache, and live hooks share one host subscription per
      query key via a refcounted registry in core
- [ ] **`useChainSpec` / token metadata helper** — auto-feed `decimals`/`symbol`
      from the host chain spec into `useFormattedBalance`
- [ ] Example apps: add a chat + statements demo page that actually exercises
      the host-only panels inside the test host

## v0.3 — Testing story for app developers

The biggest adoption lever: people need to test *their* apps, not ours.

- [ ] **`@use-truapi/test`** — a fourth package exporting a mock runtime
      (`createMockRuntime({ accounts, balances, theme, … })`) that drops into
      `TruapiProvider runtime={...}` / `TruapiPlugin { runtime }`, so app tests
      never touch the network or a host
- [ ] Playwright helpers that pre-wire `@parity/host-api-test-sdk` fixtures with
      a use-truapi config (product-account mapping, permission behaviors)
- [ ] Promote the e2e CI job from advisory to required once flake-free for ~2
      weeks (it depends on live Paseo RPC through the test host)
- [ ] Canary releases: publish `0.0.0-canary.<sha>` from `main` under a
      `canary` dist-tag for early adopters

## v0.4 — Performance & ergonomics

- [ ] **React Suspense variants** (`useSuspenseChainQuery`, …) and Vue
      `<Suspense>` support — ReactiveDOT proved the pattern for PAPI
- [ ] **Light-client standalone fallback** — optional smoldot provider when no
      `wsUrls` are configured (today standalone requires WebSocket endpoints)
- [ ] **Multi-chain examples** — asset hub + bulletin + individuality in one
      config, per-hook `chain` switching
- [ ] Devtools: opt-in debug logging via `configure()` from product-sdk-logger,
      a `<TruapiDevtools />` panel showing runtime caches/subscriptions
- [ ] Bundle audit: verify tree-shaking actually drops unused domains (chat,
      payments, contracts) from apps that don't import those hooks

## v1.0 — Stability contract

Gated on the upstream stack stabilizing (TrUAPI is versioned wire-protocol
v0.3 today and product-sdk is pre-1.0).

- [ ] Pin a supported TrUAPI protocol version range and document it
- [ ] Public API freeze + semver policy (breaking changes only on majors)
- [ ] Docs site (typedoc API reference + guides) instead of the single README
- [ ] SSR/meta-framework guidance (Nuxt, Next) — audit `window`/`localStorage`
      guards; hooks must no-op cleanly during SSR
- [ ] Accessibility + i18n pass on example apps (they double as templates)

## Continuous / maintenance

- **Track upstream releases.** `@parity/product-sdk-*`, `@parity/truapi`,
  `polkadot-api` and `@parity/host-api-test-sdk` all move fast; Renovate (or a
  weekly `bun update` ritual) + the e2e suite is the drift detector. v0.7→v0.8
  of the host SDKs was wire-incompatible — expect that again.
- **Keep the three package versions in lockstep.** The release workflow
  enforces tag == version for all three.
- **Every new hook lands in four places:** core controller → react hook → vue
  composable → README catalog row, plus a test. PRs missing one shouldn't merge.

## Known limitations (accepted for now)

- Standalone mode can't do chat, payments, notifications, cloud reads or
  statements — that's protocol reality (host services), not a bug; hooks
  degrade per the README matrix.
- Contract handles are untyped without the codegen step (v0.2 item).
- The provider-owned runtime is never destroyed (page-lifetime by design;
  pass your own `runtime` if you need teardown).
- `useChainQuery` dependency arrays are caller-supplied (React) — misuse causes
  stale reads, same trade-off as `useEffect`.
