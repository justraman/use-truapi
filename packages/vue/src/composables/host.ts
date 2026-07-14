import { useQueryClient } from "@tanstack/vue-query";
import { type HostMode, type ThemeState, queryKeys } from "@use-truapi/core";
import { type ComputedRef, type ShallowRef, computed } from "vue";
import { useRuntime } from "../context";
import {
  type MaybeGetter,
  type MutationOptions,
  type MutationResult,
  type QueryOptions,
  type QueryResult,
  toGetter,
  useStore,
  useTruapiMutation,
  useTruapiQuery,
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
export function usePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestPermission"]>[0]>;
}): MutationResult<boolean, Parameters<HostController["requestPermission"]>[0]> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (permission) => runtime.host.requestPermission(permission),
    options?.mutation,
  );
}

/** Device permissions (Camera, Notifications, Clipboard, …). */
export function useDevicePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestDevicePermission"]>[0]>;
}): MutationResult<boolean, Parameters<HostController["requestDevicePermission"]>[0]> {
  const runtime = useRuntime();
  return useTruapiMutation((kind) => runtime.host.requestDevicePermission(kind), options?.mutation);
}

type ResourceAllocationResult = Awaited<ReturnType<HostController["requestResourceAllocation"]>>;

/** RFC-0010 allowances (StatementStoreAllowance, AutoSigning, …) — one prompt up front. */
export function useResourceAllocation(options?: {
  mutation?: MutationOptions<
    ResourceAllocationResult,
    Parameters<HostController["requestResourceAllocation"]>[0]
  >;
}): MutationResult<
  ResourceAllocationResult,
  Parameters<HostController["requestResourceAllocation"]>[0]
> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (resources) => runtime.host.requestResourceAllocation(resources),
    options?.mutation,
  );
}

/** Host deep-link navigation: `.dot` routes in-container, `https://` external. */
export function useHostNavigate(): (url: string) => Promise<void> {
  const runtime = useRuntime();
  return (url) => runtime.host.navigate(url);
}

export function useFeatureSupported(
  feature: MaybeGetter<Parameters<HostController["featureSupported"]>[0] | undefined>,
  options?: { query?: QueryOptions<boolean> },
): QueryResult<boolean> {
  const runtime = useRuntime();
  const get = toGetter(feature);
  return useTruapiQuery(
    () => queryKeys.featureSupported(get()),
    () => {
      const value = get();
      return value ? runtime.host.featureSupported(value) : Promise.resolve(false);
    },
    options,
  );
}

/** RFC-0007 deterministic entropy — same key, same wallet ⇒ same 32 bytes. */
export function useDeriveEntropy(options?: {
  mutation?: MutationOptions<Uint8Array, Uint8Array>;
}): MutationResult<Uint8Array, Uint8Array> {
  const runtime = useRuntime();
  return useTruapiMutation((key) => runtime.host.deriveEntropy(key), options?.mutation);
}

type NotificationId = Awaited<ReturnType<HostController["pushNotification"]>>;

export interface NotificationsApi {
  push: MutationResult<NotificationId, Parameters<HostController["pushNotification"]>[0]>;
  cancel: (id: NotificationId) => Promise<void>;
}

/** RFC-0019 scheduled push notifications (host-only; throws HostUnavailableError standalone). */
export function useNotifications(): NotificationsApi {
  const runtime = useRuntime();
  return {
    push: useTruapiMutation((input) => runtime.host.pushNotification(input)),
    cancel: (id) => runtime.host.cancelNotification(id),
  };
}

export type HostStorageValue<T> = QueryResult<T | null> & {
  set: (value: T) => Promise<void>;
  remove: () => Promise<void>;
};

/**
 * Product-scoped KV storage: host localStorage inside a container, browser
 * localStorage standalone. JSON-serialized. Writes update the query cache
 * in place under `queryKeys.hostStorage(key)`.
 */
export function useHostStorage<T>(
  key: MaybeGetter<string>,
  options?: { query?: QueryOptions<T | null> },
): HostStorageValue<T> {
  const runtime = useRuntime();
  const queryClient = useQueryClient();
  const getKey = toGetter(key);
  const data = useTruapiQuery<T | null>(
    () => queryKeys.hostStorage(getKey()),
    () => runtime.host.storage.getJSON<T>(getKey()),
    options,
  );
  return Object.assign({}, data, {
    set: async (value: T) => {
      await runtime.host.storage.setJSON(getKey(), value);
      queryClient.setQueryData(queryKeys.hostStorage(getKey()), value);
    },
    remove: async () => {
      await runtime.host.storage.remove(getKey());
      queryClient.setQueryData(queryKeys.hostStorage(getKey()), null);
    },
  }) as HostStorageValue<T>;
}
