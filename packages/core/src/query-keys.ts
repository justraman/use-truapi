/**
 * Query keys for every read/live hook in `@use-truapi/react` and
 * `@use-truapi/vue`, exported so apps can prefetch, invalidate or read hook
 * data straight from their TanStack QueryClient:
 *
 * ```ts
 * queryClient.invalidateQueries({ queryKey: queryKeys.balance("assetHub", address) });
 * queryClient.invalidateQueries({ queryKey: ["truapi", "balance", { chain: "assetHub" }] });
 * queryClient.invalidateQueries({ queryKey: queryKeys.root }); // everything
 * ```
 *
 * The parameter object is always the last key element, so partial filters
 * (TanStack's `partialDeepEqual` matching) work on any subset of it.
 */

export type QueryKeyPart = string | number | boolean | null;

/** Make any value usable inside a query key: bigint-safe, deterministic. */
export function toKeyPart(value: unknown): QueryKeyPart {
  if (value === undefined || value === null) return null;
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return `${value}n`;
    default:
      return JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? `${v}n` : v)) ?? null;
  }
}

/**
 * Deterministic hash for a query key, matching TanStack's `hashKey` semantics
 * (object keys sorted) but bigint-safe. Used to identify shared live
 * subscriptions.
 */
export function hashQueryKey(key: readonly unknown[]): string {
  return JSON.stringify(key, (_k, value) => {
    if (typeof value === "bigint") return `${value}n`;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (value as Record<string, unknown>)[k];
          return acc;
        }, {});
    }
    return value;
  });
}

export const queryKeys = {
  root: ["truapi"] as const,

  // chain
  chainClient: (chain: string) => ["truapi", "chainClient", { chain }] as const,
  typedApi: (chain: string) => ["truapi", "typedApi", { chain }] as const,
  chainQuery: (chain: string, deps: readonly unknown[]) =>
    ["truapi", "chainQuery", { chain, deps: deps.map(toKeyPart) }] as const,
  chainSubscription: (chain: string, deps: readonly unknown[]) =>
    ["truapi", "chainSubscription", { chain, deps: deps.map(toKeyPart) }] as const,
  blockNumber: (chain: string) => ["truapi", "blockNumber", { chain }] as const,
  balance: (chain: string, address: string | null) =>
    ["truapi", "balance", { chain, address }] as const,
  chainSpec: (chain: string) => ["truapi", "chainSpec", { chain }] as const,

  // host
  featureSupported: (feature: unknown) =>
    ["truapi", "featureSupported", { feature: toKeyPart(feature) }] as const,
  hostStorage: (key: string) => ["truapi", "hostStorage", { key }] as const,

  // accounts
  userId: () => ["truapi", "userId"] as const,

  // contracts
  contract: (chain: string, manifest: QueryKeyPart, library: string, live: boolean) =>
    ["truapi", "contract", { chain, manifest, library, live }] as const,
  contractAt: (chain: string, address: string | null) =>
    ["truapi", "contractAt", { chain, address }] as const,
  contractQuery: (contract: QueryKeyPart, method: string, args: readonly unknown[]) =>
    ["truapi", "contractQuery", { contract, method, args: args.map(toKeyPart) }] as const,

  // chat
  chatRoom: (roomId: string) => ["truapi", "chatRoom", { roomId }] as const,
  chatBot: (botId: string) => ["truapi", "chatBot", { botId }] as const,
  chatRooms: () => ["truapi", "chatRooms"] as const,
  chatMessages: (roomId: string | null) => ["truapi", "chatMessages", { roomId }] as const,

  // statements
  statements: (topic2: string | null) => ["truapi", "statements", { topic2 }] as const,

  // payments
  paymentBalance: (purse: QueryKeyPart) => ["truapi", "paymentBalance", { purse }] as const,
  paymentStatus: (paymentId: string) => ["truapi", "paymentStatus", { paymentId }] as const,

  // cloud storage
  cid: (cid: string | null, json: boolean) => ["truapi", "cid", { cid, json }] as const,
  storageAuthorization: (address: string | null) =>
    ["truapi", "storageAuthorization", { address }] as const,
} as const;
