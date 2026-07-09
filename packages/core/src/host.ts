import {
  type AllocatableResource,
  type AllocationOutcome,
  type ChainSpec,
  type DevicePermissionKind,
  type Feature,
  type HostError,
  HostUnavailableError,
  type NotificationId,
  type PushNotificationInput,
  type RemotePermissionItem,
  type Result,
  getHostLocalStorage,
  getNotificationManager,
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
} from "@parity/product-sdk-host";
import { type ReadonlyStore, type Store, createStore } from "./store";

export type HostMode = "unknown" | "host" | "standalone";

/** Collapse the SDK's Result union into the throw-on-error idiom hooks expose. */
export function unwrapResult<T>(result: Result<T, HostError>): T {
  if (!result.ok) throw result.error;
  return result.value;
}

export interface HostController {
  mode: ReadonlyStore<HostMode>;
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

export function createHostController(): HostController {
  const mode: Store<HostMode> = createStore<HostMode>(isInsideContainerSync() ? "host" : "unknown");
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
        if (host) return host.readString(key);
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

  return {
    mode,
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
    pushNotification: async (input) =>
      (await requireHost(getNotificationManager, "notifications")).push(input),
    cancelNotification: async (id) =>
      (await requireHost(getNotificationManager, "notifications")).cancel(id),
    storage,
  };
}
