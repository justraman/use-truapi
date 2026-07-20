# Contracts (PolkaVM)

Read/write PolkaVM (pallet-revive) contracts. A contract handle (`Contract<ContractDef>`) comes from either a `cdm.json` manifest (the file `cdm deploy` produces) via `useContract`, or a raw H160 address + ABI via `useContractAt`; feed the handle to `useContractQuery` (reads) and `useContractTx` (writes). Before an account's first contract tx it must be mapped in pallet-revive once per chain — `useEnsureAccountMapped`. React: pass the resolved handle `contract.data` to downstream hooks. Vue quirk: pass the whole `contract` query result instead — downstream composables unwrap `.data` reactively.

## useContract

`useContract(cdmJson: CdmJson, library: string, options?: { chain?: string; live?: boolean; query? }) → UseQueryResult<Contract<ContractDef>, Error>`

- Keep the manifest import in one shared module (`import manifest from "../contracts/cdm.json"; export const cdmJson = manifest as unknown as CdmJson;`) — the cache key derives from the manifest object/name, so every component must pass the same object.
- Managers cached per (chain, manifest name, library, `live` flag) and share the runtime's signer; many components can resolve the same manifest cheaply.
- Addresses come from the manifest snapshot by default; `live: true` resolves them from the on-chain CDM registry so the handle follows re-deployments without shipping a new manifest.

## useContractAt

`useContractAt(address: \`0x${string}\` | undefined, abi: AbiEntry[], options?: { chain?: string; query? }) → UseQueryResult<Contract<ContractDef>, Error>`

- Same `Contract` handle as `useContract` — downstream hooks work identically. Use when the address arrives at runtime (user input, route params, registry lookup).
- While `address` is `undefined` the hook stays disabled (`isPending`, no fetch) — no guarding needed. Cached under (chain, address).

## useContractQuery

`useContractQuery<T = unknown>(contract: Contract | undefined, method: string, args: readonly unknown[], options?: { enabled?: boolean; query? }) → UseQueryResult<T, Error>`

- Read-only `ReviveApi.call` dry-run; never signs or submits. `data` is the decoded return value — pass the expected type as the generic. Cached under (contract identity, method, args); different args are different cache entries.
- Disabled until the handle resolves; `options.enabled` ANDs with that built-in gate (use it while inputs are incomplete, e.g. `enabled: owner !== undefined`).
- Reverts are thrown, not data: error message `use-truapi: contract query "method" reverted` with the revert value attached as `error.cause`. Unknown method: `contract has no method "method"`.
- One-shot, not a subscription — call `refetch()` to observe a new value after a write (e.g. from a tx `onSuccess`).

## useContractTx

`useContractTx(contract: Contract | undefined, method: string, options?: { mutation? }) → NamedMutation<TxResult> & { send: (args?: readonly unknown[]) => Promise<TxResult> }`

- `send()` dry-runs first, then signs with the connected account, submits and watches; resolves with `TxResult` once in a block. Bare `send()` for zero-arg methods, `send([5n])` with an args array. Mutation state (`data`, `error`, `isPending`, `reset`) tracks the last send.
- Dispatch failure is data, not thrown: check `result.ok`; a failed dispatch carries the decoded `result.dispatchError`.
- `send` rejects (and sets `error`) when: handle not resolved yet, method missing on handle, dry-run fails, or user rejects the signature. Fire-and-forget click handlers need only `.catch(() => {})` since failures also land in `error`.
- `ContractError` / `ContractRevertedError` (fields `methodName`, `data`, `reason?`, `decoded?`) are exported from `@use-truapi/react` for inspecting SDK-level revert errors.

## useEnsureAccountMapped

`useEnsureAccountMapped(cdmJson: CdmJson, options?: { chain?: string; mutation? }) → NamedMutation<void, void> & { ensureMapped: () => Promise<void> }`

- `ensureMapped()` maps the connected account on the contract's chain; resolves with no data. Idempotent — no-op if already mapped, so calling defensively before the first write is safe. Needed once per account per chain.
- Pass the same `cdmJson` object as `useContract` — it scopes the mapping to the same cached contract manager.

## End-to-end example (React)

```ts
// counter-contract.ts — one shared module so the cache key is stable
import type { CdmJson } from "@use-truapi/react";
import manifest from "../contracts/cdm.json";
export const COUNTER_LIBRARY = "@my-app/counter";
export const cdmJson = manifest as unknown as CdmJson;
```

```tsx
import { useContract, useContractQuery, useContractTx, useEnsureAccountMapped } from "@use-truapi/react";
import { COUNTER_LIBRARY, cdmJson } from "./counter-contract";

function Counter() {
  const contract = useContract(cdmJson, COUNTER_LIBRARY); // or: { live: true, chain: "assetHub" }
  const count = useContractQuery<bigint>(contract.data, "getCount", []);
  const mapAccount = useEnsureAccountMapped(cdmJson);
  const add = useContractTx(contract.data, "add", {
    mutation: { onSuccess: () => count.refetch() },
  });

  async function onAdd() {
    try {
      await mapAccount.ensureMapped();       // no-op if already mapped
      const result = await add.send([5n]);   // dry-run → sign → submit → in block
      if (!result.ok) console.error("dispatch failed", result.dispatchError);
    } catch {
      // failures also land in mapAccount.error / add.error
    }
  }

  return (
    <>
      <p>Count: {count.data?.toString() ?? "…"}</p>
      <button disabled={!contract.data || mapAccount.isPending || add.isPending} onClick={onAdd}>
        Add 5
      </button>
      {add.error && <p role="alert">{add.error.message}</p>}
    </>
  );
}
```
