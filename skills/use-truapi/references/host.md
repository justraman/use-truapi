# Host hooks
Host container detection, theme, permissions (remote/device/resource), deep-link navigation, push notifications, KV storage, and wallet-derived entropy.

## useHostMode
`useHostMode(): "unknown" | "host" | "standalone"`
- `"unknown"` while async detection is pending; settles on `"host"` or `"standalone"`. If the container is detectable synchronously, `"host"` from the first render (no flash).
- Use when the pending window matters (e.g. splash instead of standalone-only UI); otherwise use `useIsHost`.

## useIsHost
`useIsHost(): boolean`
- `true` exactly when mode is `"host"`; `false` both while detection is pending and when genuinely standalone.
- Ideal for gating host-only UI (stays hidden until host confirmed). Need to distinguish "detecting" from "standalone"? Use `useHostMode`.

## useHostConnectionStatus
`useHostConnectionStatus(): "connecting" | "connected" | "disconnected"`
- The host *transport* channel (not the wallet): `"connecting"` while waiting for the host, `"connected"` once up, `"disconnected"` standalone or after the channel closes. Never builds a host client outside a container.
- Use for reconnect banners or to hold host calls until connected. Wallet connection is `useAccounts().status`.

## useHostInfo
`useHostInfo(options?: { query? }): UseQueryResult<HostInfo | null, Error>` — `HostInfo = { platform: "Web" | "Android" | "Ios" | "Desktop" | "Cli" | "Unknown"; name: string; version: string }`
- `System.host_info`: which host build is running the app — adapt layout per platform, label telemetry/bug reports.
- Best-effort: `data` is `null` standalone AND on hosts predating the method — always branch on it. Fetched once, cached.

## useProductContext
`useProductContext(options?: { query? }): UseQueryResult<ProductContext | null, Error>` — `{ productId: string }`
- The canonical id the host derives accounts/permissions from, TLD included (`my-app.dot`, `my-app.paseo`, `localhost:3000` under `truapi-host dev`). Use it for every `dotNsIdentifier` / `ProductProofContext` instead of hard-coding a suffix.
- The runtime already uses it: without `productAccount.dotNsIdentifier` in config, connect() derives the account from it, falling back to `${dappName}.dot` on legacy hosts. `null` standalone / legacy hosts.

## useHostChainInfo
`useHostChainInfo(identifiers: HostChainIdentifier[], options?: { query? }): UseQueryResult<HostChainDiscovery | null, Error>` — `HostChainIdentifier = "Relay" | "AssetHub" | "People" | "Bulletin"`; `HostChainDiscovery = { network: string; chains: Partial<Record<HostChainIdentifier, "0x…">> }`
- RFC-0026: resolve chain roles to genesis hashes against the host's configured network — replaces hard-coded hashes that go stale after testnet resets. Roles the host doesn't serve are absent from `chains`.
- `null` standalone, on legacy hosts, or when none of the roles is served — keep a fallback (descriptor `.genesis`). Cached per role set for the connection lifetime.
- Usually implicit: set `hostChain: "AssetHub"` in the chain config and the runtime resolves the genesis before requesting the host provider (`genesisHash` becomes the fallback and may be omitted).

```tsx
const { data } = useHostChainInfo(["AssetHub", "People"]);
const assetHub = data?.chains.AssetHub ?? (paseo_asset_hub.genesis as `0x${string}`);
```

## useTheme
`useTheme(): ThemeState` — `{ variant: "light" | "dark"; custom: string | null; source: "host" | "system" }`
- Live: follows host theme when embedded (incl. custom host themes); tracks `prefers-color-scheme` standalone. `source` says which; `custom` is always `null` outside a host.
- Before detection resolves it reports the system theme, then flips to the host theme — always renderable.

## useLocale
`useLocale(): LocaleState` — `{ languageTag: string; source: "host" | "navigator" }`
- Live: the language the host presents its UI in (`Locale.subscribe`) when embedded; `navigator.language` (+ `languagechange`) standalone. `languageTag` is an open BCP 47 tag (`en`, `pt-BR`, `zh-Hans`) — pick your own fallback for tags you don't ship.
- Hosts predating the locale domain end the subscription; the hook keeps the navigator value. Vue returns a `ShallowRef`.

## usePermission
`usePermission(options?: { mutation? }) → { request(permission: RemotePermission): Promise<boolean>, ...mutation state }`
- RFC-0002 remote permissions. `RemotePermission` variants: `{ tag: "Remote", value: { domains: string[] } }`, `{ tag: "WebRtc" }`, `{ tag: "ChainSubmit" }`, `{ tag: "PreimageSubmit" }`, `{ tag: "StatementSubmit" }`.
- Resolves `true` = granted, `false` = user declined (denial is data, not an exception); thrown errors mean the request itself failed.
- Rarely needed for `ChainSubmit`/`StatementSubmit`/`PreimageSubmit` — business hooks request those implicitly on first use (e.g. `useTx` requests `ChainSubmit` on first submit). Use it to front-load prompts or for permissions with no implicit trigger (`Remote` domains).
- Standalone: `request` rejects with `HostUnavailableError` — gate on `useIsHost`.

```tsx
const { request, isPending, error } = usePermission();
const granted = await request({ tag: "Remote", value: { domains: ["api.example.com"] } });
```

## useDevicePermission
`useDevicePermission(options?: { mutation? }) → { request(kind: DevicePermissionKind): Promise<boolean>, ...mutation state }`
- `kind`: `"Notifications" | "Camera" | "Microphone" | "Bluetooth" | "NFC" | "Location" | "Clipboard" | "OpenUrl" | "Biometrics"` (plain string, e.g. `request("Camera")`).
- Covers local hardware/OS integrations (vs `usePermission`'s remote ops). Request just-in-time, right before the feature that needs it.
- Resolves `true`/`false` (denial is data); standalone `request` rejects with `HostUnavailableError` — fall back to regular web APIs (`navigator.mediaDevices`, Notification API).

## useResourceAllocation
`useResourceAllocation(options?: { mutation? }) → { request(resources: AllocatableResource[]): Promise<AllocationOutcome[]>, ...mutation state }`
- RFC-0010 pre-allocation, batching several allowances into one user prompt. `AllocatableResource`: `{ tag: "StatementStoreAllowance" }`, `{ tag: "BulletinAllowance" }`, `{ tag: "SmartContractAllowance", value: number }` (derivation index), `{ tag: "AutoSigning" }`.
- Resolves one `AllocationOutcome` per resource, same order: `"Allocated" | "Rejected" | "NotAvailable"`. Per-resource rejection is data; thrown errors mean the request failed.
- Allowance resources may also be fulfilled implicitly on first submission; `AutoSigning` has no implicit path — must be requested here.
- Standalone: `request` rejects with `HostUnavailableError` — gate on `useIsHost`.

```tsx
const { request } = useResourceAllocation();
const [statements, autoSigning] = await request([
  { tag: "StatementStoreAllowance" },
  { tag: "AutoSigning" },
]); // each: "Allocated" | "Rejected" | "NotAvailable"
```

## useHostNavigate
`useHostNavigate(): (url: string) => Promise<void>`
- Plain stable async function — NOT a mutation (no `isPending`/`error` state).
- Host resolves the destination: `.dot` deep link (e.g. `https://search.dot`) routes to another app/route inside the container; regular `https://` opens externally in the system browser.
- Rejects with `HostUnavailableError` standalone and `HostCallFailedError` when the host denies navigation — catch the promise if failure matters. Standalone fallback: plain anchor or `window.open`.

## useFeatureSupported
`useFeatureSupported(feature: Feature | undefined, options?: { query? }): UseQueryResult<boolean, Error>`
- `Feature`'s only variant today: `{ tag: "Chain", value: genesisHash }` with a `0x`-prefixed genesis hash.
- While `feature` is `undefined` the query resolves `false` without asking the host (safe to pass a not-yet-ready value). Results cached per feature — many components, one round-trip.
- Standalone: `HostUnavailableError` surfaces on the query's `error` — gate on `useIsHost`.

```tsx
const { data: supported, isPending } = useFeatureSupported({ tag: "Chain", value: PEOPLE_GENESIS });
```

## useDeriveEntropy
`useDeriveEntropy(options?: { mutation? }) → { derive(key: Uint8Array): Promise<Uint8Array>, ...mutation state }`
- RFC-0007: resolves 32 deterministic bytes — same key + same wallet ⇒ same bytes across sessions and devices; different key or wallet ⇒ unrelated bytes.
- Building block for secrets you never store/sync: encryption keys, app-identity seeds, deterministic salts. Use distinct namespaced keys (`my-app/settings-encryption/v1`).
- Standalone: `derive` rejects with `HostUnavailableError` — gate on `useIsHost`.

```tsx
const { derive } = useDeriveEntropy();
const key = await derive(new TextEncoder().encode("my-app/notes-encryption/v1")); // 32 bytes
```

## useNotifications
`useNotifications() → { push(input): Promise<NotificationId>, cancel(id: number): Promise<void>, ...mutation state (for push) }`
- RFC-0019. `push` input: `{ text: string; deeplink?: string; scheduledAt?: bigint }` — `scheduledAt` is a Unix timestamp in ms (UTC), omit for immediate delivery. Resolves a numeric `NotificationId`; pass it to `cancel(id)` to cancel a pending scheduled notification.
- Mutation state on the returned object tracks the push: `isPending`, `data` (last id), `error` (e.g. host's pending-notification cap), `reset()`.
- Host-only, no browser fallback: standalone BOTH `push` and `cancel` reject with `HostUnavailableError` — gate the whole feature on `useIsHost`.

```tsx
const { push, cancel, isPending, error } = useNotifications();
const id = await push({ text: "Auction ending!", deeplink: "https://auctions.dot/lot/42", scheduledAt: endsAt - 600_000n });
await cancel(id);
```

## useHostStorage
`useHostStorage<T>(key: string, options?: { query? }): UseQueryResult<T | null, Error> & { set(value: T): Promise<void>, remove(): Promise<void> }`
- Product-scoped JSON KV store. `data` is the parsed value, `null` when unset. Type via the generic for typed `data`/`set`.
- Backing store follows the environment: host localStorage in a container (host-persisted, product-scoped), browser localStorage standalone — identical behavior, one of the few host APIs needing NO gating.
- Writes update the query cache in place (key `queryKeys.hostStorage(key)`): every component reading the key sees the new value immediately, no refetch/flicker. Values are JSON round-tripped — no `bigint`, `Date`, or `Uint8Array`.
- Vue: the key can be a getter (`() => "draft:" + props.id`); the query re-runs AND the writers retarget when it changes.

```tsx
const { data, isPending, set, remove } = useHostStorage<Settings>("settings");
await set({ ...data, compactMode: true }); // serialize + persist
await remove(); // delete key → data becomes null
```
