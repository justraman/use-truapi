import type { AbiEntry, CdmJson, Contract, ContractDef, TxResult } from "@use-truapi/core";
import { type ChainKey, useRuntime } from "../context";
import { type AsyncAction, type AsyncData, useAsyncAction, useAsyncData } from "../internal";

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
  return useAsyncData(
    () => runtime.contracts.getContract(cdmJson, library, options),
    [runtime, cdmJson, library, options?.chain, options?.live],
  );
}

/** Ad-hoc contract from an H160 address + ABI — no manifest needed. */
export function useContractAt(
  address: `0x${string}` | undefined,
  abi: AbiEntry[],
  options?: { chain?: ChainKey },
): AsyncData<Contract<ContractDef>> {
  const runtime = useRuntime();
  return useAsyncData(async () => {
    if (!address) throw new Error("use-truapi: useContractAt needs an address");
    return runtime.contracts.getContractAt(address, abi, options);
  }, [runtime, address, abi, options?.chain]);
}

/**
 * Read-only contract call (`ReviveApi.call` dry-run) — re-runs when args change.
 *
 * ```ts
 * const count = useContractQuery(contract, "getCount", []);
 * ```
 */
export function useContractQuery<T = unknown>(
  contract: Contract<ContractDef> | undefined,
  method: string,
  args: readonly unknown[],
  options?: { enabled?: boolean },
): AsyncData<T> {
  return useAsyncData(async () => {
    if (!contract || options?.enabled === false) return undefined as T;
    const handle = (contract as Record<string, { query: (...a: unknown[]) => Promise<unknown> }>)[
      method
    ];
    if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
    const result = (await handle.query(...args)) as { success: boolean; value: unknown };
    if (!result.success) {
      throw new Error(`use-truapi: contract query "${method}" reverted`, { cause: result.value });
    }
    return result.value as T;
  }, [contract, method, options?.enabled, JSON.stringify(args, jsonBigint)]);
}

/**
 * Contract transaction as a mutation: dry-run pre-flight, then sign/submit/watch.
 *
 * ```ts
 * const increment = useContractTx(contract, "increment");
 * await increment.run();
 * ```
 */
export function useContractTx(
  contract: Contract<ContractDef> | undefined,
  method: string,
): AsyncAction<unknown[], TxResult> {
  return useAsyncAction(async (...args: unknown[]) => {
    if (!contract) throw new Error("use-truapi: contract not ready");
    const handle = (contract as Record<string, { tx: (...a: unknown[]) => Promise<TxResult> }>)[
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

function jsonBigint(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
