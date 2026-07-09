import { type AccountBalance, type TypedApiOf, resolveChain } from "@use-truapi/core";
import type { PolkadotClient } from "polkadot-api";
import { type ChainKey, type ResolvedChains, useRuntime } from "../context";
import {
  type AsyncData,
  type MaybeGetter,
  type WatchState,
  toGetter,
  useAsyncData,
  useSubscription,
} from "../internal";

export interface ChainScope<K extends ChainKey = ChainKey> {
  chain?: K;
}

/** The raw PAPI client — escape hatch for anything the composables don't cover. */
export function useChainClient(options?: ChainScope): AsyncData<PolkadotClient> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chains.getClient(options?.chain));
}

/** The descriptor-typed PAPI api for a configured chain. */
export function useTypedApi<K extends ChainKey>(
  options?: ChainScope<K>,
): AsyncData<TypedApiOf<ResolvedChains, K>> {
  const runtime = useRuntime();
  return useAsyncData(
    () => runtime.chains.getTypedApi(options?.chain) as Promise<TypedApiOf<ResolvedChains, K>>,
  );
}

/**
 * One-shot read against the typed api. Reactive sources read inside `read`
 * (refs, props) re-trigger it automatically.
 */
export function useChainQuery<T, K extends ChainKey = ChainKey>(
  read: (api: TypedApiOf<ResolvedChains, K>) => Promise<T>,
  options?: ChainScope<K> & { enabled?: MaybeGetter<boolean> },
): AsyncData<T> {
  const runtime = useRuntime();
  const enabled = toGetter(options?.enabled ?? true);
  return useAsyncData(async () => {
    if (!enabled()) return undefined as T;
    const api = (await runtime.chains.getTypedApi(options?.chain)) as TypedApiOf<ResolvedChains, K>;
    return read(api);
  });
}

/** Live subscription to any typed-api observable; torn down with the scope. */
export function useChainSubscription<T, K extends ChainKey = ChainKey>(
  select: (
    api: TypedApiOf<ResolvedChains, K>,
    client: PolkadotClient,
  ) => {
    subscribe(observer: { next: (v: T) => void; error?: (e: unknown) => void }): {
      unsubscribe(): void;
    };
  },
  options?: ChainScope<K> & { enabled?: MaybeGetter<boolean> },
): WatchState<T> {
  const runtime = useRuntime();
  return useSubscription<T>(
    (onValue, onError) =>
      runtime.chains.watch<T, K>(select as never, onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [],
    toGetter(options?.enabled ?? true),
  );
}

/** Best-block number, live. */
export function useBlockNumber(
  options?: ChainScope & { enabled?: MaybeGetter<boolean> },
): WatchState<number> {
  const runtime = useRuntime();
  return useSubscription<number>(
    (onValue, onError) =>
      runtime.chains.watchBlockNumber(onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [],
    toGetter(options?.enabled ?? true),
  );
}

/** Live native balance of `address` (free/reserved/frozen, in planck). */
export function useBalance(
  address: MaybeGetter<string | undefined>,
  options?: ChainScope,
): WatchState<AccountBalance> {
  const runtime = useRuntime();
  const getAddress = toGetter(address);
  return useSubscription<AccountBalance>(
    (onValue, onError) =>
      runtime.chains.watchBalance(getAddress() ?? "", onValue, {
        ...(options?.chain !== undefined ? { chain: options.chain } : {}),
        onError,
      }),
    [getAddress],
    () => getAddress() !== undefined,
  );
}

/** Chain name/properties as reported by the host (null standalone). */
export function useChainSpec(options?: ChainScope) {
  const runtime = useRuntime();
  return useAsyncData(async () => {
    const { chain } = resolveChain(runtime.config, options?.chain);
    return runtime.host.getChainSpec(chain.genesisHash);
  });
}
