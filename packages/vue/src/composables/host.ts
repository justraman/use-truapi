import type { HostMode, ThemeState } from "@use-truapi/core";
import { type ComputedRef, type ShallowRef, computed } from "vue";
import { useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  type MaybeGetter,
  toGetter,
  useAsyncAction,
  useAsyncData,
  useStore,
} from "../internal";

type HostController = ReturnType<typeof useRuntime>["host"];

/** `"unknown"` until async detection resolves, then `"host"` | `"standalone"`. */
export function useHostMode(): ShallowRef<HostMode> {
  return useStore(useRuntime().host.mode);
}

/** False while detection is pending — gate host-only UI on `useHostMode()` if the distinction matters. */
export function useIsHost(): ComputedRef<boolean> {
  const mode = useHostMode();
  return computed(() => mode.value === "host");
}

/** Live theme: host theme when embedded, `prefers-color-scheme` standalone. */
export function useTheme(): ShallowRef<ThemeState> {
  return useStore(useRuntime().theme);
}

/** RFC-0002 remote permissions (ChainSubmit, StatementSubmit, Remote domains, …). */
export function usePermission(): AsyncAction<
  Parameters<HostController["requestPermission"]>,
  boolean
> {
  const runtime = useRuntime();
  return useAsyncAction((permission) => runtime.host.requestPermission(permission));
}

/** Device permissions (Camera, Notifications, Clipboard, …). */
export function useDevicePermission(): AsyncAction<
  Parameters<HostController["requestDevicePermission"]>,
  boolean
> {
  const runtime = useRuntime();
  return useAsyncAction((kind) => runtime.host.requestDevicePermission(kind));
}

/** RFC-0010 allowances (StatementStoreAllowance, AutoSigning, …) — one prompt up front. */
export function useResourceAllocation(): AsyncAction<
  Parameters<HostController["requestResourceAllocation"]>,
  Awaited<ReturnType<HostController["requestResourceAllocation"]>>
> {
  const runtime = useRuntime();
  return useAsyncAction((resources) => runtime.host.requestResourceAllocation(resources));
}

/** Host deep-link navigation: `.dot` routes in-container, `https://` external. */
export function useHostNavigate(): (url: string) => Promise<void> {
  const runtime = useRuntime();
  return (url) => runtime.host.navigate(url);
}

export function useFeatureSupported(
  feature: MaybeGetter<Parameters<HostController["featureSupported"]>[0] | undefined>,
): AsyncData<boolean> {
  const runtime = useRuntime();
  const get = toGetter(feature);
  return useAsyncData(() => {
    const value = get();
    return value ? runtime.host.featureSupported(value) : Promise.resolve(false);
  });
}

/** RFC-0007 deterministic entropy — same key, same wallet ⇒ same 32 bytes. */
export function useDeriveEntropy(): AsyncAction<[key: Uint8Array], Uint8Array> {
  const runtime = useRuntime();
  return useAsyncAction((key) => runtime.host.deriveEntropy(key));
}

export interface NotificationsApi {
  push: AsyncAction<
    Parameters<HostController["pushNotification"]>,
    Awaited<ReturnType<HostController["pushNotification"]>>
  >;
  cancel: (id: Awaited<ReturnType<HostController["pushNotification"]>>) => Promise<void>;
}

/** RFC-0019 scheduled push notifications (host-only; throws HostUnavailableError standalone). */
export function useNotifications(): NotificationsApi {
  const runtime = useRuntime();
  return {
    push: useAsyncAction((input) => runtime.host.pushNotification(input)),
    cancel: (id) => runtime.host.cancelNotification(id),
  };
}

export interface HostStorageValue<T> extends AsyncData<T | null> {
  set: (value: T) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Product-scoped KV storage: host localStorage inside a container, browser
 * localStorage standalone. JSON-serialized.
 */
export function useHostStorage<T>(key: MaybeGetter<string>): HostStorageValue<T> {
  const runtime = useRuntime();
  const getKey = toGetter(key);
  const data = useAsyncData(() => runtime.host.storage.getJSON<T>(getKey()));
  return {
    ...data,
    set: async (value: T) => {
      await runtime.host.storage.setJSON(getKey(), value);
      data.refetch();
    },
    remove: async () => {
      await runtime.host.storage.remove(getKey());
      data.refetch();
    },
  };
}
