import {
  type AllocatableResource,
  type AllocationOutcome,
  type ChainSpec,
  type DevicePermissionKind,
  type Feature,
  type HostChainDiscovery,
  type HostChainIdentifier,
  type HostConnectionStatus,
  type HostError,
  HostUnavailableError,
  type NotificationId,
  type PushNotificationInput,
  type RemotePermissionItem,
  type Result,
  type TruApi,
  formatHostError,
  getHostChainInfo,
  getHostLocalStorage,
  getNotificationManager,
  getTruApi,
  isInsideContainer,
  isInsideContainerSync,
  deriveEntropy as sdkDeriveEntropy,
  featureSupported as sdkFeatureSupported,
  getChainSpec as sdkGetChainSpec,
  isChainSupported as sdkIsChainSupported,
  navigateTo as sdkNavigateTo,
  requestDevicePermission as sdkRequestDevicePermission,
  requestPermission as sdkRequestPermission,
  requestResourceAllocation as sdkRequestResourceAllocation,
  subscribeConnectionStatus,
} from "@parity/product-sdk-host";
import type { HostInfo, HostPlatform } from "@parity/truapi";
import { type ReadonlyStore, type Store, createLazyStore, createStore } from "./store";

export type HostMode = "unknown" | "host" | "standalone";

export type {
  HostChainDiscovery,
  HostChainIdentifier,
  HostConnectionStatus,
  HostInfo,
  HostPlatform,
};

/** Canonical product identifier the host derives accounts and permissions from. */
export interface ProductContext {
  /** Full dotNS identifier including its network TLD (`my-app.dot`, `my-app.paseo`, `localhost:3000`). */
  productId: string;
}

/** Collapse the SDK's Result union into the throw-on-error idiom hooks expose. */
export function unwrapResult<T, E extends Error = HostError>(result: Result<T, E>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

export interface HostController {
  mode: ReadonlyStore<HostMode>;
  /**
   * Host-channel transport status: `"connecting"` while the client waits for
   * the host, `"connected"` once the channel is up, `"disconnected"`
   * standalone or after the channel closes.
   */
  connectionStatus: ReadonlyStore<HostConnectionStatus>;
  /** Memoized async host detection; resolves the `mode` store as a side effect. */
  detect(): Promise<boolean>;
  navigate(url: string): Promise<void>;
  requestPermission(permission: RemotePermissionItem): Promise<boolean>;
  requestDevicePermission(kind: DevicePermissionKind): Promise<boolean>;
  requestResourceAllocation(resources: AllocatableResource[]): Promise<AllocationOutcome[]>;
  deriveEntropy(key: Uint8Array): Promise<Uint8Array>;
  featureSupported(feature: Feature): Promise<boolean>;
  isChainSupported(genesisHash: `0x${string}`): Promise<boolean>;
  getChainSpec(genesisHash: `0x${string}`): Promise<ChainSpec | null>;
  /**
   * Host identity and version (`System.host_info`). Null standalone and on
   * hosts that predate the method — treat it as best-effort.
   */
  getInfo(): Promise<HostInfo | null>;
  /**
   * The canonical product id the host bound this runtime to
   * (`System.get_product_context`). Null standalone or on legacy hosts.
   */
  getProductContext(): Promise<ProductContext | null>;
  /**
   * RFC-0026 chain discovery: resolve chain roles to genesis hashes against
   * the host's configured network. Null standalone, on legacy hosts, or when
   * the host serves none of the roles.
   */
  getChainInfo(identifiers: readonly HostChainIdentifier[]): Promise<HostChainDiscovery | null>;
  pushNotification(input: PushNotificationInput): Promise<NotificationId>;
  cancelNotification(id: NotificationId): Promise<void>;
  storage: HostKvStorage;
}

export interface HostKvStorage {
  getString(key: string): Promise<string | null>;
  setString(key: string, value: string): Promise<void>;
  getJSON<T>(key: string): Promise<T | null>;
  setJSON<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Whether a truapi call error means "this host does not implement the method".
 * New protocol methods are best-effort on older hosts, so callers map this to
 * `null` instead of surfacing an error.
 */
export function isUnsupportedCall(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { tag?: unknown }).tag === "Unsupported"
  );
}

/**
 * Hosts that predate a method's wire id may never answer it at all (rather
 * than replying `Unsupported`), so best-effort probes are bounded. The answer
 * comes from host config with no chain I/O, so a short deadline is enough.
 */
const PROBE_TIMEOUT_MS = 3_000;

/**
 * Run a raw truapi call that the SDK has no wrapper for yet. Resolves `null`
 * standalone, when the host reports the method as unsupported, and when a
 * legacy host never answers within the probe deadline; other host errors
 * throw with the host's reason.
 */
async function bestEffortCall<T>(
  detect: () => Promise<boolean>,
  label: string,
  call: (truapi: TruApi) => {
    match: <A, B>(onOk: (value: T) => A, onErr: (error: unknown) => B) => Promise<A | B>;
  },
): Promise<T | null> {
  if (!(await detect())) return null;
  const truapi = await getTruApi();
  if (!truapi) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const probe = call(truapi).match(
    (value) => value,
    (error) => {
      if (isUnsupportedCall(error)) return null;
      throw new Error(`use-truapi: ${label} failed: ${formatHostError(error)}`, { cause: error });
    },
  );
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS);
  });
  return Promise.race([probe, timeout]).finally(() => clearTimeout(timer));
}

export function createHostController(): HostController {
  const inside = isInsideContainerSync();
  const mode: Store<HostMode> = createStore<HostMode>(inside ? "host" : "unknown");
  let detection: Promise<boolean> | null = null;

  const detect = (): Promise<boolean> => {
    if (!detection) {
      detection = isInsideContainer().then(
        (inside) => {
          mode.set(inside ? "host" : "standalone");
          return inside;
        },
        () => {
          mode.set("standalone");
          return false;
        },
      );
    }
    return detection;
  };
  detect();

  // Subscribing to the transport status is what builds the client outside an
  // established channel, so only attach once detection says we are hosted.
  const connectionStatus = createLazyStore<HostConnectionStatus>(
    inside ? "connecting" : "disconnected",
    (set) => {
      let cancelled = false;
      let stop: (() => void) | undefined;
      void detect().then((hosted) => {
        if (cancelled) return;
        if (!hosted) {
          set("disconnected");
          return;
        }
        stop = subscribeConnectionStatus(set);
      });
      return () => {
        cancelled = true;
        stop?.();
      };
    },
  );

  const requireHost = async <T>(get: () => Promise<T | null>, what: string): Promise<T> => {
    const value = (await detect()) ? await get() : null;
    if (value === null) throw new HostUnavailableError(what);
    return value;
  };

  // Host storage inside a container, browser localStorage standalone — hooks
  // behave identically in both environments.
  const storage: HostKvStorage = {
    async getString(key) {
      if (await detect()) {
        const host = await getHostLocalStorage();
        if (host) {
          const value = await host.readString(key);
          // The SDK reads a missing key as "" — normalize to the null every
          // other store in this module uses.
          return value === "" ? null : value;
        }
      }
      return globalThis.localStorage?.getItem(key) ?? null;
    },
    async setString(key, value) {
      if (await detect()) {
        const host = await getHostLocalStorage();
        if (host) return host.writeString(key, value);
      }
      globalThis.localStorage?.setItem(key, value);
    },
    async getJSON<T>(key: string): Promise<T | null> {
      const raw = await storage.getString(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    },
    async setJSON<T>(key: string, value: T) {
      await storage.setString(key, JSON.stringify(value));
    },
    async remove(key) {
      if (await detect()) {
        const host = await getHostLocalStorage();
        if (host) return host.clear(key);
      }
      globalThis.localStorage?.removeItem(key);
    },
  };

  let info: Promise<HostInfo | null> | null = null;
  let productContext: Promise<ProductContext | null> | null = null;

  return {
    mode,
    connectionStatus,
    detect,
    navigate: async (url) => unwrapResult(await sdkNavigateTo(url)),
    requestPermission: async (permission) => unwrapResult(await sdkRequestPermission(permission)),
    requestDevicePermission: async (kind) => unwrapResult(await sdkRequestDevicePermission(kind)),
    requestResourceAllocation: async (resources) =>
      unwrapResult(await sdkRequestResourceAllocation(resources)),
    deriveEntropy: async (key) => unwrapResult(await sdkDeriveEntropy(key)),
    featureSupported: async (feature) => unwrapResult(await sdkFeatureSupported(feature)),
    isChainSupported: async (genesisHash) => unwrapResult(await sdkIsChainSupported(genesisHash)),
    getChainSpec: async (genesisHash) => unwrapResult(await sdkGetChainSpec(genesisHash)),
    // Host identity and product context never change for the life of the
    // connection, so the first answer is cached; failures evict it.
    getInfo: () => {
      if (!info) {
        info = bestEffortCall<HostInfo>(detect, "host info", (truapi) => truapi.system.info());
        info.catch(() => {
          info = null;
        });
      }
      return info;
    },
    getProductContext: () => {
      if (!productContext) {
        productContext = bestEffortCall<ProductContext>(detect, "product context", (truapi) =>
          truapi.system.getProductContext(),
        );
        productContext.catch(() => {
          productContext = null;
        });
      }
      return productContext;
    },
    getChainInfo: async (identifiers) => ((await detect()) ? getHostChainInfo(identifiers) : null),
    pushNotification: async (input) =>
      (await requireHost(getNotificationManager, "notifications")).push(input),
    cancelNotification: async (id) =>
      (await requireHost(getNotificationManager, "notifications")).cancel(id),
    storage,
  };
}
