import { getHostProvider } from "@parity/product-sdk-host";
import { type PolkadotClient, type TypedApi, createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws";
import { type AnyChains, type ChainConfig, type TruapiConfig, resolveChain } from "./config";
import type { HostController } from "./host";

const DEFAULT_HOST_PROVIDER_TIMEOUT_MS = 15_000;

export type TypedApiOf<TChains extends AnyChains, K extends keyof TChains> = TypedApi<
  TChains[K]["descriptor"]
>;

export interface Unsubscribable {
  unsubscribe(): void;
}

export interface ObservableLike<T> {
  subscribe(observer: {
    next: (value: T) => void;
    error?: (error: unknown) => void;
  }): Unsubscribable;
}

export interface AccountBalance {
  free: bigint;
  reserved: bigint;
  frozen: bigint;
}

export interface ChainController<TChains extends AnyChains> {
  getClient(chain?: keyof TChains & string): Promise<PolkadotClient>;
  getTypedApi<K extends keyof TChains & string>(chain?: K): Promise<TypedApiOf<TChains, K>>;
  /**
   * Bridge an async typed-api Observable into a callback with safe teardown:
   * unsubscribing before the client resolves never leaks the subscription.
   */
  watch<T, K extends keyof TChains & string>(
    select: (api: TypedApiOf<TChains, K>, client: PolkadotClient) => ObservableLike<T>,
    onValue: (value: T) => void,
    options?: { chain?: K; onError?: (error: unknown) => void },
  ): () => void;
  watchBlockNumber(
    onValue: (blockNumber: number) => void,
    options?: { chain?: keyof TChains & string; onError?: (error: unknown) => void },
  ): () => void;
  watchBalance(
    address: string,
    onValue: (balance: AccountBalance) => void,
    options?: { chain?: keyof TChains & string; onError?: (error: unknown) => void },
  ): () => void;
  destroy(): void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

async function buildClient(
  host: HostController,
  chain: ChainConfig,
  timeoutMs: number,
): Promise<PolkadotClient> {
  const inHost = await host.detect();
  if (inHost) {
    const provider = await withTimeout(
      getHostProvider(chain.genesisHash),
      timeoutMs,
      `host chain provider for ${chain.genesisHash}`,
    );
    if (!provider)
      throw new Error(`use-truapi: host returned no provider for ${chain.genesisHash}`);
    return createClient(provider);
  }
  if (!chain.wsUrls?.length) {
    throw new Error(
      `use-truapi: running standalone and chain ${chain.genesisHash} has no wsUrls configured — add wsUrls to the chain config to enable standalone development`,
    );
  }
  return createClient(getWsProvider(chain.wsUrls));
}

export function createChainController<TChains extends AnyChains>(
  config: TruapiConfig<TChains>,
  host: HostController,
): ChainController<TChains> {
  // Cache the promise, not the client, so concurrent callers share one
  // in-flight connection; evict on failure so the next call can retry.
  const clients = new Map<string, Promise<PolkadotClient>>();
  const timeoutMs = config.hostProviderTimeoutMs ?? DEFAULT_HOST_PROVIDER_TIMEOUT_MS;

  const getClient = (chainKey?: keyof TChains & string): Promise<PolkadotClient> => {
    const { key, chain } = resolveChain(config, chainKey);
    let client = clients.get(key);
    if (!client) {
      client = buildClient(host, chain, timeoutMs);
      client.catch(() => clients.delete(key));
      clients.set(key, client);
    }
    return client;
  };

  const getTypedApi = async <K extends keyof TChains & string>(
    chainKey?: K,
  ): Promise<TypedApiOf<TChains, K>> => {
    const { chain } = resolveChain(config, chainKey);
    const client = await getClient(chainKey);
    return client.getTypedApi(chain.descriptor) as TypedApiOf<TChains, K>;
  };

  const watch: ChainController<TChains>["watch"] = (select, onValue, options) => {
    let cancelled = false;
    let sub: Unsubscribable | undefined;
    void (async () => {
      try {
        const client = await getClient(options?.chain);
        if (cancelled) return;
        const { chain } = resolveChain(config, options?.chain);
        const api = client.getTypedApi(chain.descriptor);
        sub = select(api as never, client).subscribe({
          next: onValue,
          error: (e) => options?.onError?.(e),
        });
        if (cancelled) sub.unsubscribe();
      } catch (e) {
        if (!cancelled) options?.onError?.(e);
      }
    })();
    return () => {
      cancelled = true;
      sub?.unsubscribe();
    };
  };

  return {
    getClient,
    getTypedApi,
    watch,
    watchBlockNumber: (onValue, options) => {
      let cancelled = false;
      let sub: Unsubscribable | undefined;
      void getClient(options?.chain)
        .then((client) => {
          if (cancelled) return;
          sub = client.bestBlocks$.subscribe({
            next: (blocks) => {
              const best = blocks[0];
              if (best) onValue(best.number);
            },
            error: (e) => options?.onError?.(e),
          });
          if (cancelled) sub.unsubscribe();
        })
        .catch((e) => {
          if (!cancelled) options?.onError?.(e);
        });
      return () => {
        cancelled = true;
        sub?.unsubscribe();
      };
    },
    watchBalance: (address, onValue, options) =>
      watch(
        // System.Account exists on every Substrate chain; the descriptor
        // union can't express that, so the query path is asserted once here.
        (api) =>
          (
            api as unknown as {
              query: {
                System: {
                  Account: {
                    watchValue: (
                      address: string,
                      options?: { at: "best" | "finalized" },
                    ) => ObservableLike<{ value: { data: AccountBalance } }>;
                  };
                };
              };
            }
          ).query.System.Account.watchValue(address, { at: "best" }),
        ({ value }) =>
          onValue({
            free: value.data.free,
            reserved: value.data.reserved,
            frozen: value.data.frozen,
          }),
        options,
      ),
    destroy: () => {
      for (const client of clients.values()) {
        client.then((c) => c.destroy()).catch(() => {});
      }
      clients.clear();
    },
  };
}
