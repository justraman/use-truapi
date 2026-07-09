import { type AccountBalance, type TypedApiOf, resolveChain } from "@use-truapi/core";
import type { PolkadotClient } from "polkadot-api";
import { type ChainKey, type ResolvedChains, useRuntime } from "../context";
import { type AsyncData, type WatchState, useAsyncData, useWatch } from "../internal";

export interface ChainScope<K extends ChainKey = ChainKey> {
  chain?: K;
}

/** The raw PAPI client — escape hatch for anything the hooks don't cover. */
export function useChainClient(options?: ChainScope): AsyncData<PolkadotClient> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chains.getClient(options?.chain), [runtime, options?.chain]);
}

/** The descriptor-typed PAPI api for a configured chain. */
export function useTypedApi<K extends ChainKey>(
  options?: ChainScope<K>,
): AsyncData<TypedApiOf<ResolvedChains, K>> {
  const runtime = useRuntime();
  return useAsyncData(
    () => runtime.chains.getTypedApi(options?.chain) as Promise<TypedApiOf<ResolvedChains, K>>,
    [runtime, options?.chain],
  );
}

/**
 * One-shot read against the typed api; re-runs when `deps` change.
 *
 * ```ts
 * const total = useChainQuery((api) => api.query.Balances.TotalIssuance.getValue(), []);
 * ```
 */
export function useChainQuery<T, K extends ChainKey = ChainKey>(
  read: (api: TypedApiOf<ResolvedChains, K>) => Promise<T>,
  deps: readonly unknown[],
  options?: ChainScope<K> & { enabled?: boolean },
): AsyncData<T> {
  const runtime = useRuntime();
  const enabled = options?.enabled ?? true;
  return useAsyncData(async () => {
    if (!enabled) return undefined as T;
    const api = (await runtime.chains.getTypedApi(options?.chain)) as TypedApiOf<ResolvedChains, K>;
    return read(api);
  }, [runtime, options?.chain, enabled, ...deps]);
}

/**
 * Live subscription to any typed-api observable (storage watch, events, …);
 * automatically unsubscribed on unmount and dependency change.
 *
 * ```ts
 * const now = useChainSubscription(
 *   (api) => api.query.Timestamp.Now.watchValue(),
 *   [],
 * );
 * ```
 */
export function useChainSubscription<T, K extends ChainKey = ChainKey>(
  select: (
    api: TypedApiOf<ResolvedChains, K>,
    client: PolkadotClient,
  ) => {
    subscribe(observer: { next: (v: T) => void; error?: (e: unknown) => void }): {
      unsubscribe(): void;
    };
  },
  deps: readonly unknown[],
  options?: ChainScope<K> & { enabled?: boolean },
): WatchState<T> {
  const runtime = useRuntime();
  return useWatch<T>(
    (onValue, onError) =>
      runtime.chains.watch<T, K>(select as never, onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [runtime, options?.chain, ...deps],
    options?.enabled ?? true,
  );
}

/** Best-block number, live. */
export function useBlockNumber(options?: ChainScope & { enabled?: boolean }): WatchState<number> {
  const runtime = useRuntime();
  return useWatch<number>(
    (onValue, onError) =>
      runtime.chains.watchBlockNumber(onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [runtime, options?.chain],
    options?.enabled ?? true,
  );
}

/** Live native balance of `address` (free/reserved/frozen, in planck). */
export function useBalance(
  address: string | undefined,
  options?: ChainScope,
): WatchState<AccountBalance> {
  const runtime = useRuntime();
  return useWatch<AccountBalance>(
    (onValue, onError) =>
      runtime.chains.watchBalance(address ?? "", onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [runtime, address, options?.chain],
    address !== undefined,
  );
}

/** Chain name/properties as reported by the host (null standalone). */
export function useChainSpec(options?: ChainScope) {
  const runtime = useRuntime();
  return useAsyncData(async () => {
    const { chain } = resolveChain(runtime.config, options?.chain);
    return runtime.host.getChainSpec(chain.genesisHash);
  }, [runtime, options?.chain]);
}
