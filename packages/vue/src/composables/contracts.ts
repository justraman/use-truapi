import type { AbiEntry, CdmJson, Contract, ContractDef, TxResult } from "@use-truapi/core";
import { type ChainKey, useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  type MaybeGetter,
  toGetter,
  useAsyncAction,
  useAsyncData,
} from "../internal";

export interface ContractScope<K extends ChainKey = ChainKey> {
  chain?: K;
  /** Resolve addresses from the live CDM registry instead of the manifest snapshot. */
  live?: boolean;
}

/**
 * Typed contract handle from a `cdm.json` manifest. Managers are cached per
 * (chain, manifest) and share the runtime's SignerManager.
 */
export function useContract(
  cdmJson: CdmJson,
  library: string,
  options?: ContractScope,
): AsyncData<Contract<ContractDef>> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.contracts.getContract(cdmJson, library, options));
}

/** Ad-hoc contract from an H160 address + ABI — no manifest needed. */
export function useContractAt(
  address: MaybeGetter<`0x${string}` | undefined>,
  abi: AbiEntry[],
  options?: { chain?: ChainKey },
): AsyncData<Contract<ContractDef>> {
  const runtime = useRuntime();
  const getAddress = toGetter(address);
  return useAsyncData(async () => {
    const resolved = getAddress();
    if (!resolved) throw new Error("use-truapi: useContractAt needs an address");
    return runtime.contracts.getContractAt(resolved, abi, options);
  });
}

/** Read-only contract call (`ReviveApi.call` dry-run); reactive args re-run it. */
export function useContractQuery<T = unknown>(
  contract: AsyncData<Contract<ContractDef>>,
  method: string,
  args: MaybeGetter<readonly unknown[]> = [],
  options?: { enabled?: MaybeGetter<boolean> },
): AsyncData<T> {
  const getArgs = toGetter(args);
  const enabled = toGetter(options?.enabled ?? true);
  return useAsyncData(async () => {
    const handleSource = contract.data.value;
    if (!handleSource || !enabled()) return undefined as T;
    const handle = (
      handleSource as Record<string, { query: (...a: unknown[]) => Promise<unknown> }>
    )[method];
    if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
    const result = (await handle.query(...getArgs())) as { success: boolean; value: unknown };
    if (!result.success) {
      throw new Error(`use-truapi: contract query "${method}" reverted`, { cause: result.value });
    }
    return result.value as T;
  });
}

/** Contract transaction as a mutation: dry-run pre-flight, then sign/submit/watch. */
export function useContractTx(
  contract: AsyncData<Contract<ContractDef>>,
  method: string,
): AsyncAction<unknown[], TxResult> {
  return useAsyncAction(async (...args: unknown[]) => {
    const handleSource = contract.data.value;
    if (!handleSource) throw new Error("use-truapi: contract not ready");
    const handle = (handleSource as Record<string, { tx: (...a: unknown[]) => Promise<TxResult> }>)[
      method
    ];
    if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
    return handle.tx(...args);
  });
}

/** Idempotent pallet-revive account mapping — required once before contract txs. */
export function useEnsureAccountMapped(
  cdmJson: CdmJson,
  options?: { chain?: ChainKey },
): AsyncAction<[], void> {
  const runtime = useRuntime();
  return useAsyncAction(() => runtime.contracts.ensureMapped(cdmJson, options));
}
