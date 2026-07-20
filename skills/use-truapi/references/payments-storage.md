# Payments, cloud storage & formatting

RFC-0006 payments (host-only purse balance, payment requests, top-ups, status tracking), Bulletin-backed cloud storage (uploads, CID retrieval, quota), and planck display helpers.

## usePaymentBalance

`usePaymentBalance(options?: { purse?: number; enabled?: boolean; query? }) → query result; data: PaymentBalance { available: bigint }`

- Live subscription to the app's payment purse: `data.available` is the spendable amount in planck, pushed by the host (never polled — nothing to refetch). Omit `purse` for the main purse; pass a `PaymentPurseId` (number) for another product purse.
- Components watching the same purse share one host subscription (dropped when the last consumer unmounts).
- Host-only. Standalone the hook surfaces `HostUnavailableError` on `error` instead of loading forever — check `error` or gate on `useIsHost()` and hide payment UI.

## useRequestPayment

`useRequestPayment(options?: { mutation? }) → { request(amount: bigint, destination: "0x${string}", from?: number) => Promise<{ id: string }>, ...mutation state }`

- The host renders the payment confirmation UI (your app never does). The promise resolves `{ id }` — hand it straight to `usePaymentStatus`. Rejection/failure both throws out of `request` and lands in `error`, so await it only in one async handler.
- `from` is an optional `PaymentPurseId` to pay from a non-main purse.
- Host-only: standalone the call rejects with `HostUnavailableError`.

```tsx
import { usePaymentStatus, useRequestPayment } from "@use-truapi/react";
import { useState } from "react";

function PayButton({ price, merchant }: { price: bigint; merchant: `0x${string}` }) {
  const [paymentId, setPaymentId] = useState<string>();
  const { request, isPending, error } = useRequestPayment();
  const { data: status } = usePaymentStatus(paymentId);

  async function onPay() {
    const { id } = await request(price, merchant);
    setPaymentId(id);
  }

  return (
    <>
      <button onClick={onPay} disabled={isPending}>Pay</button>
      {error && <p role="alert">{error.message}</p>}
      {status?.tag === "Processing" && <p>Processing…</p>}
      {status?.tag === "Completed" && <p>Paid</p>}
      {status?.tag === "Failed" && <p role="alert">{status.value.reason}</p>}
    </>
  );
}
```

## useTopUp

`useTopUp(options?: { mutation? }) → { topUp(amount: bigint, source: PaymentTopUpSource, into?: number) => Promise<void>, ...mutation state }`

- Moves funds into the payment purse; resolves once the host performed the top-up. No return value — watch `usePaymentBalance` to see funds land. `into` targets a non-main purse.
- `PaymentTopUpSource` is a tagged union: `{ tag: "ProductAccount", value: { derivationIndex: number } }` (a product-scoped account), `"PrivateKey"` (one-time account by sr25519 secret key), or `"Coins"` (coin secret keys, one per coin).
- Fire-and-forget pattern: `void topUp(amount, { tag: "ProductAccount", value: { derivationIndex: 0 } }).catch(() => {})` — the failure still shows up in `error`, success in `isSuccess`.
- Host-only: standalone the call rejects with `HostUnavailableError`.

## usePaymentStatus

`usePaymentStatus(paymentId: string | undefined, options?: { query? }) → query result; data: PaymentStatus`

- `data` is a tagged union: `{ tag: "Processing" }` while in flight, then terminal `{ tag: "Completed" }` or `{ tag: "Failed", value: { reason: string } }` (human-readable reason).
- Disabled while `paymentId` is `undefined` — pass the id straight from request-payment state without guarding; the subscription attaches when the id exists and is shared per payment id. Pushed, not polled.
- Host-only: standalone (with an id set) the hook surfaces `HostUnavailableError` on `error`.

## useUpload

`useUpload(options?: { mutation? }) → { upload(data: Uint8Array, options?: { chunkSize?: number; onProgress?: (event: ProgressEvent) => void }) => Promise<StoreResult>, ...mutation state }`

- Stores raw bytes on Bulletin-backed cloud storage. `StoreResult` receipt: `cid` (CID object — `.toString()` for a string, may be undefined), `size`, plus `blockNumber` and `extrinsicIndex` when known. Pass the cid to `useCid` to read content back.
- Config prerequisite: `defineConfig` must include `cloudStorage: { environment }`, or every storage hook rejects with a config error. Works in host and standalone alike.
- Uploads are signed: the storage client is created lazily on first use and signs with the connected account — connect before the first upload or it rejects with a clear error.
- Large payloads: pass per-upload `chunkSize` and `onProgress` for chunked upload with progress events.

```tsx
import { useCid, useUpload } from "@use-truapi/react";
import { useState } from "react";

function NoteUploader() {
  const [cid, setCid] = useState<string>();
  const upload = useUpload({
    mutation: { onSuccess: (result) => setCid(result.cid?.toString()) },
  });
  const stored = useCid<{ title: string }>(cid, { json: true });

  function onSave(note: { title: string }) {
    const data = new TextEncoder().encode(JSON.stringify(note));
    void upload.upload(data).catch(() => {}); // failure lands in upload.error
  }
  // stored.data?.title once the round trip completes
}
```

## useCid

`useCid<T = Uint8Array>(cid: string | undefined, options?: { json?: boolean; query? }) → query result; data: T`

- `data` is a raw `Uint8Array` by default (decode with `TextDecoder` yourself); `json: true` parses the bytes as JSON, typed by the generic: `useCid<Note>(cid, { json: true })`.
- Disabled while `cid` is `undefined` (`isPending`, no fetch) — pass it unguarded from an upload receipt or route params.
- Cached per (cid, json) pair; CID content is immutable so the cache never goes stale.

## useStorageAuthorization

`useStorageAuthorization(address?: string, options?: { query? }) → query result; data: AuthorizationStatus`

- `data`: `authorized` (boolean), `remainingTransactions`, `remainingBytes` (bigint), `expiration` (block number) — all zero when not authorized. Cached per address.
- No argument checks the selected account; pass an address to check another. If neither exists the query errors — gate behind a connect step or render `error.message`.
- Use before `useUpload`: an unauthorized account or exhausted quota rejects the upload on chain.

## useFormattedBalance

`useFormattedBalance(planck: bigint | null | undefined, options?: { decimals?: number; maxDecimals?: number; symbol?: string; locale?: string }) → string`

- Display formatting: locale-aware thousand separators, fraction truncation, optional symbol, trailing `.0` omitted. Memoized; recomputes only when value/options change.
- Null-safe: `undefined`/`null` → `""`, so `balance?.free` from a pending query needs no guard.
- Vue quirk: returns a `ComputedRef<string>` (not a plain string) and the input may be a getter.

```ts
useFormattedBalance(10_000_000_000n);                        // "1"
useFormattedBalance(15_000_000_000n, { symbol: "DOT" });     // "1.5 DOT"
useFormattedBalance(10_000_000_000_000n, { symbol: "DOT" }); // "1,000 DOT"
useFormattedBalance(12_345_678_900n, { maxDecimals: 2 });    // "1.23"
useFormattedBalance(undefined);                              // ""
```

## Non-hook helpers

Exported from `@use-truapi/react` (and every package) for use outside components:

- `formatBalance(planck: bigint, options?: FormatBalanceOptions) → string` — same output as `useFormattedBalance` (throws on negative planck rather than returning `""`).
- `formatPlanck(planck: bigint, decimals?: number) → string` — plain decimal string, default 10 decimals; trims trailing zeros but always keeps ≥1 fractional digit (`10_000_000_000n` → `"1.0"`). Throws on negative planck or invalid decimals.
- `parseToPlanck(amount: string, decimals?: number) → bigint` — `"1.5"` → `15_000_000_000n` (default 10 decimals); silently truncates excess fractional digits with a warning; throws on empty/negative/invalid input.
