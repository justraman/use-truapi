import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  type AbiEntry,
  type CdmJson,
  type Contract,
  type ContractDef,
  type TxResult,
  queryKeys,
  resolveChain,
} from "@use-truapi/core";
import { type ChainKey, useRuntime } from "../context";
import {
  type MutationOptions,
  type OptionalVariables,
  type QueryOptions,
  useTruapiMutation,
  useTruapiQuery,
} from "../internal";

export interface ContractScope<K extends ChainKey = ChainKey> {
  chain?: K;
  /** Resolve addresses from the live CDM registry instead of the manifest snapshot. */
  live?: boolean;
}

// Query keys need a serializable identity for manifests and contract handles;
// a per-object id is stable for the session, which is all a cache key needs.
const weakIds = new WeakMap<object, number>();
let nextWeakId = 1;
function weakId(value: object): string {
  let id = weakIds.get(value);
  if (id === undefined) {
    id = nextWeakId++;
    weakIds.set(value, id);
  }
  return `#${id}`;
}

function manifestKey(cdmJson: CdmJson): string {
  const name = (cdmJson as { name?: unknown }).name;
  return typeof name === "string" ? name : weakId(cdmJson);
}

/**
 * Typed contract handle from a `cdm.json` manifest. Managers are cached per
 * (chain, manifest) and share the runtime's SignerManager.
 */
export function useContract(
  cdmJson: CdmJson,
  library: string,
  options?: ContractScope & { query?: QueryOptions<Contract<ContractDef>> },
): UseQueryResult<Contract<ContractDef>, Error> {
  const runtime = useRuntime();
  const chainKey = resolveChain(runtime.config, options?.chain).key;
  return useTruapiQuery(
    queryKeys.contract(chainKey, manifestKey(cdmJson), library, options?.live ?? false),
    () => runtime.contracts.getContract(cdmJson, library, options),
    options,
  );
}

/** Ad-hoc contract from an H160 address + ABI — no manifest needed. */
export function useContractAt(
  address: `0x${string}` | undefined,
  abi: AbiEntry[],
  options?: { chain?: ChainKey; query?: QueryOptions<Contract<ContractDef>> },
): UseQueryResult<Contract<ContractDef>, Error> {
  const runtime = useRuntime();
  const chainKey = resolveChain(runtime.config, options?.chain).key;
  return useTruapiQuery(
    queryKeys.contractAt(chainKey, address ?? null),
    async () => {
      if (!address) throw new Error("use-truapi: useContractAt needs an address");
      return runtime.contracts.getContractAt(address, abi, options);
    },
    { ...options, enabled: address !== undefined },
  );
}

/**
 * Read-only contract call (`ReviveApi.call` dry-run) — cached under the
 * contract identity, method and args.
 *
 * ```ts
 * const count = useContractQuery(contract, "getCount", []);
 * ```
 */
export function useContractQuery<T = unknown>(
  contract: Contract<ContractDef> | undefined,
  method: string,
  args: readonly unknown[],
  options?: { enabled?: boolean; query?: QueryOptions<T> },
): UseQueryResult<T, Error> {
  return useTruapiQuery<T>(
    queryKeys.contractQuery(contract ? weakId(contract) : null, method, args),
    async () => {
      if (!contract) throw new Error("use-truapi: contract not ready");
      const handle = (contract as Record<string, { query: (...a: unknown[]) => Promise<unknown> }>)[
        method
      ];
      if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
      const result = (await handle.query(...args)) as { success: boolean; value: unknown };
      if (!result.success) {
        throw new Error(`use-truapi: contract query "${method}" reverted`, {
          cause: result.value,
        });
      }
      return result.value as T;
    },
    { ...options, enabled: contract !== undefined && (options?.enabled ?? true) },
  );
}

/**
 * Contract transaction as a mutation: dry-run pre-flight, then sign/submit/watch.
 *
 * ```ts
 * const increment = useContractTx(contract, "increment");
 * await increment.mutateAsync([]);
 * ```
 */
export function useContractTx(
  contract: Contract<ContractDef> | undefined,
  method: string,
  options?: { mutation?: MutationOptions<TxResult, OptionalVariables<readonly unknown[]>> },
): UseMutationResult<TxResult, Error, OptionalVariables<readonly unknown[]>> {
  return useTruapiMutation(async (args: OptionalVariables<readonly unknown[]>) => {
    if (!contract) throw new Error("use-truapi: contract not ready");
    const handle = (contract as Record<string, { tx: (...a: unknown[]) => Promise<TxResult> }>)[
      method
    ];
    if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
    return handle.tx(...(args ?? []));
  }, options?.mutation);
}

/** Idempotent pallet-revive account mapping — required once before contract txs. */
export function useEnsureAccountMapped(
  cdmJson: CdmJson,
  options?: { chain?: ChainKey; mutation?: MutationOptions<void, void> },
): UseMutationResult<void, Error, void> {
  const runtime = useRuntime();
  return useTruapiMutation(
    () => runtime.contracts.ensureMapped(cdmJson, options),
    options?.mutation,
  );
}
