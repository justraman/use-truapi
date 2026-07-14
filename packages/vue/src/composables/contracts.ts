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
  type MaybeGetter,
  type MutationOptions,
  type MutationResult,
  type OptionalVariables,
  type QueryOptions,
  type QueryResult,
  toGetter,
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
): QueryResult<Contract<ContractDef>> {
  const runtime = useRuntime();
  const chainKey = resolveChain(runtime.config, options?.chain).key;
  return useTruapiQuery(
    () => queryKeys.contract(chainKey, manifestKey(cdmJson), library, options?.live ?? false),
    () => runtime.contracts.getContract(cdmJson, library, options),
    options,
  );
}

/** Ad-hoc contract from an H160 address + ABI — no manifest needed. */
export function useContractAt(
  address: MaybeGetter<`0x${string}` | undefined>,
  abi: AbiEntry[],
  options?: { chain?: ChainKey; query?: QueryOptions<Contract<ContractDef>> },
): QueryResult<Contract<ContractDef>> {
  const runtime = useRuntime();
  const chainKey = resolveChain(runtime.config, options?.chain).key;
  const getAddress = toGetter(address);
  return useTruapiQuery(
    () => queryKeys.contractAt(chainKey, getAddress() ?? null),
    async () => {
      const resolved = getAddress();
      if (!resolved) throw new Error("use-truapi: useContractAt needs an address");
      return runtime.contracts.getContractAt(resolved, abi, options);
    },
    { ...options, enabled: () => getAddress() !== undefined },
  );
}

/**
 * Read-only contract call (`ReviveApi.call` dry-run) — cached under the
 * contract identity, method and args; reactive args re-run it.
 */
export function useContractQuery<T = unknown>(
  contract: QueryResult<Contract<ContractDef>>,
  method: string,
  args: MaybeGetter<readonly unknown[]> = [],
  options?: { enabled?: MaybeGetter<boolean>; query?: QueryOptions<T> },
): QueryResult<T> {
  const getArgs = toGetter(args);
  const enabled = toGetter(options?.enabled ?? true);
  return useTruapiQuery<T>(
    () =>
      queryKeys.contractQuery(
        contract.data.value ? weakId(contract.data.value) : null,
        method,
        getArgs(),
      ),
    async () => {
      const handleSource = contract.data.value;
      if (!handleSource) throw new Error("use-truapi: contract not ready");
      const handle = (
        handleSource as Record<string, { query: (...a: unknown[]) => Promise<unknown> }>
      )[method];
      if (!handle) throw new Error(`use-truapi: contract has no method "${method}"`);
      const result = (await handle.query(...getArgs())) as { success: boolean; value: unknown };
      if (!result.success) {
        throw new Error(`use-truapi: contract query "${method}" reverted`, { cause: result.value });
      }
      return result.value as T;
    },
    {
      ...options,
      enabled: () => contract.data.value !== undefined && enabled() !== false,
    },
  );
}

/** Contract transaction as a mutation: dry-run pre-flight, then sign/submit/watch. */
export function useContractTx(
  contract: QueryResult<Contract<ContractDef>>,
  method: string,
  options?: { mutation?: MutationOptions<TxResult, OptionalVariables<readonly unknown[]>> },
): MutationResult<TxResult, OptionalVariables<readonly unknown[]>> {
  return useTruapiMutation(async (args: OptionalVariables<readonly unknown[]>) => {
    const handleSource = contract.data.value;
    if (!handleSource) throw new Error("use-truapi: contract not ready");
    const handle = (handleSource as Record<string, { tx: (...a: unknown[]) => Promise<TxResult> }>)[
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
): MutationResult<void, void> {
  const runtime = useRuntime();
  return useTruapiMutation(
    () => runtime.contracts.ensureMapped(cdmJson, options),
    options?.mutation,
  );
}
