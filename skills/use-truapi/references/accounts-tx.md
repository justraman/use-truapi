# Accounts & transactions

Wallet connection, account selection, signing, RFC-0009 login, and transaction submission hooks (`@use-truapi/react`). All account hooks read one shared store: connect/select/disconnect anywhere updates every consumer.

## useAccounts

`useAccounts(): { accounts: SignerAccount[], selectedAccount: SignerAccount | null, status, error, isConnected, isConnecting, connect(provider?) => Promise<SignerAccount[]>, disconnect(): void, select(address): SignerAccount }`

- `status`: `"disconnected" | "connecting" | "connected" | "error"`; `isConnected`/`isConnecting` derived from it. `error` is `SignerError | null`.
- `connect()` auto-detects provider (host provider inside a host container, dev accounts standalone); force with `connect("host")` / `connect("dev")`. Concurrent callers share one attempt; a failure evicts it so the next call retries. With `autoConnect: true` in config, the runtime connects on startup.
- `select(address)` throws if the address is not in `accounts`; the selection feeds all downstream hooks (useSigner, useTx, ...).
- `SignerAccount`: `{ address: SS58String /* generic prefix 42 */, h160Address: '0x…', publicKey: Uint8Array, name: string | null, source: ProviderType, getSigner(): PolkadotSigner }`.
- Vue: state fields are `ComputedRef`s (`.value` in script, auto-unwrap in templates); the actions are plain functions. Same for `useSelectedAccount`/`useSigner` return values.

```tsx
const { accounts, selectedAccount, isConnected, isConnecting, error, connect, disconnect, select } = useAccounts();
// not connected:
<button onClick={() => void connect().catch(() => {})} disabled={isConnecting}>Connect</button>
// connected: list accounts, select(account.address), disconnect()
```

## useConnect

`useConnect(options?: { mutation? }): { connect(provider?: "host" | "dev") => Promise<SignerAccount[]>, data, error, isPending, reset }`

- Same shared connect as `useAccounts`, but with per-call mutation state — use it when a button needs its own `isPending`/`error`.
- Failures reject the returned promise AND land in `error`; handlers can `void connect().catch(() => {})` and render `error`.
- Resolves with the account list, handy when connecting is step one of a flow: `const accounts = await connect();`.

## useDisconnect

`useDisconnect(): () => void`

- Synchronous, nothing to await: empties `accounts`, nulls `selectedAccount`/signer, `status` → `"disconnected"`, and resets the shared connect attempt.

## useSelectedAccount

`useSelectedAccount(): SignerAccount | null`

- The account the user is acting as; `null` until connected. Pass `account?.address` straight into read hooks (e.g. `useBalance`) — they stay disabled while `undefined`.

## useSigner

`useSigner(): PolkadotSigner | null`

- Rarely needed: `useTx` and other write hooks pull the signer themselves and handle host permissions. Use only to hand a `PolkadotSigner` to raw polkadot-api or another library.

## useLogin

`useLogin(options?: { mutation? }): { login(reason?: string) => Promise<LoginResult>, data, error, isPending, reset }`

- RFC-0009 host login. MUST be called from a user gesture (click handler) — the host rejects non-gesture requests; never call from an effect/on mount. `reason` shows in the host consent prompt.
- User declining is data, not an exception: `LoginResult` = `"Success" | "AlreadyConnected" | "Rejected"`. Standalone (no host) login is a no-op returning `"AlreadyConnected"`.

## useUserId

`useUserId(options?: { query? }): UseQueryResult<string | null>` (`data`, `isPending`, `refetch`, ...)

- Primary DotNS username from the host. `data` is `null` standalone or when not logged in (no error). Fetched once and cached — call `refetch()` after a successful login.

```tsx
const { data: userId, isPending, refetch } = useUserId();
const { login } = useLogin({ mutation: { onSuccess: () => refetch() } });
// !userId → <button onClick={() => void login("Sign in").catch(() => {})}>Log in</button>
// data === "Rejected" → user declined (render as state, not error)
```

## useSignRaw

`useSignRaw(options?: { mutation? }): { sign(data: Uint8Array) => Promise<Uint8Array>, data, error, isPending, reset }`

- Signs arbitrary bytes with the currently selected account — for off-chain proofs/auth challenges, not transactions. The `data` argument is required (unlike `connect`/`login`).
- Rejects (and sets `error`) when no account is connected or the user rejects the signing prompt.

## useTx

`useTx(options?: { chain?: K, mutation? }): { submit(build, options?) => Promise<TxResult>, phase, data, error, isPending, isSuccess, status, reset, ... }`

- `build: (api) => SubmittableTransaction | Promise<...>` — built against the typed PAPI api; pass `{ chain: "people" }` to build against a specific chain's api.
- Submit options: `waitFor?: "finalized"` (default resolves at best-block) and `onStatus?: (status: TxStatus) => void` with `TxStatus = "signing" | "broadcasting" | "in-block" | "finalized" | "error"`. `phase` exposes the same lifecycle plus `"idle"`; `reset()` clears state and returns `phase` to `"idle"`.
- First submit requests the `ChainSubmit` permission and connects the signer if needed — no manual pre-flight.
- Errors: thrown `TxSigningRejectedError` / `TxError` (base class — `instanceof TxError` catches any tx error) mean the tx never reached a block. Dispatch failure is data: `TxResult = { ok: boolean, txHash, block: { hash, number, index }, events, dispatchError? }` — always check `result.ok`. `dispatchError` is the raw decoded polkadot-api enum (typed `unknown`); walk its nested `.type`/`.value` fields for a `"Pallet.ErrorName"` label, or just show a generic failure message.

```tsx
import { useTx } from "@use-truapi/react";
// generated descriptors; with prebuilt ones import MultiAddress from
// "@parity/product-sdk-descriptors/<chain>" instead
import { MultiAddress } from "@polkadot-api/descriptors";

const { submit, phase, isPending, error } = useTx();
const result = await submit(
  (api) => api.tx.Balances.transfer_keep_alive({ dest: MultiAddress.Id(dest), value }),
  { waitFor: "finalized", onStatus: (s) => console.log(s) },
);
if (!result.ok) console.error("dispatch failed", result.dispatchError);
```

## useBatchTx

`useBatchTx(options?: { chain?: K, mutation? }): { submit(build, options?) => Promise<TxResult>, phase, ... }` — same shape as `useTx`

- `build` returns an ARRAY of calls (any pallets, same typed api); wrapped in one `Utility` transaction: one signature, one fee.
- Options: all of `useTx`'s (`waitFor`, `onStatus`) plus `mode`: `"batch_all"` (default, atomic — any failure reverts all), `"batch"` (stops at first failure, earlier calls stay applied), `"force_batch"` (continues past failures).
- Same lifecycle, permission request, and TxResult/error semantics as `useTx`; in atomic mode a failing call reverts the batch and `dispatchError` carries the reason.

```tsx
const { submit } = useBatchTx();
const result = await submit(
  (api) => recipients.map((dest) =>
    api.tx.Balances.transfer_keep_alive({ dest: MultiAddress.Id(dest), value })),
  { mode: "force_batch", waitFor: "finalized" },
);
```
