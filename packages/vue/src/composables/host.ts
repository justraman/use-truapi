import { useQueryClient } from "@tanstack/vue-query";
import { type HostMode, type ThemeState, queryKeys } from "@use-truapi/core";
import { type ComputedRef, type ShallowRef, computed } from "vue";
import { useRuntime } from "../context";
import {
  type MaybeGetter,
  type MutationOptions,
  type NamedMutation,
  type QueryOptions,
  type QueryResult,
  dropMutate,
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

/** RFC-0002 remote permissions (ChainSubmit, StatementSubmit, Remote domains, …): `request(permission)`. */
export function usePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestPermission"]>[0]>;
}): NamedMutation<boolean, Parameters<HostController["requestPermission"]>[0]> & {
  request: (permission: Parameters<HostController["requestPermission"]>[0]) => Promise<boolean>;
} {
  const runtime = useRuntime();
  const mutation = useTruapiMutation(
    (permission: Parameters<HostController["requestPermission"]>[0]) =>
      runtime.host.requestPermission(permission),
    options?.mutation,
  );
  return {
    ...dropMutate(mutation),
    request: (permission) => mutation.mutateAsync(permission),
  };
}

/** Device permissions (Camera, Notifications, Clipboard, …): `request(kind)`. */
export function useDevicePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestDevicePermission"]>[0]>;
}): NamedMutation<boolean, Parameters<HostController["requestDevicePermission"]>[0]> & {
  request: (kind: Parameters<HostController["requestDevicePermission"]>[0]) => Promise<boolean>;
} {
  const runtime = useRuntime();
  const mutation = useTruapiMutation(
    (kind: Parameters<HostController["requestDevicePermission"]>[0]) =>
      runtime.host.requestDevicePermission(kind),
    options?.mutation,
  );
  return {
    ...dropMutate(mutation),
    request: (kind) => mutation.mutateAsync(kind),
  };
}

type ResourceAllocationResult = Awaited<ReturnType<HostController["requestResourceAllocation"]>>;

/** RFC-0010 allowances (StatementStoreAllowance, AutoSigning, …), one prompt up front: `request(resources)`. */
export function useResourceAllocation(options?: {
  mutation?: MutationOptions<
    ResourceAllocationResult,
    Parameters<HostController["requestResourceAllocation"]>[0]
  >;
}): NamedMutation<
  ResourceAllocationResult,
  Parameters<HostController["requestResourceAllocation"]>[0]
> & {
  request: (
    resources: Parameters<HostController["requestResourceAllocation"]>[0],
  ) => Promise<ResourceAllocationResult>;
} {
  const runtime = useRuntime();
  const mutation = useTruapiMutation(
    (resources: Parameters<HostController["requestResourceAllocation"]>[0]) =>
      runtime.host.requestResourceAllocation(resources),
    options?.mutation,
  );
  return {
    ...dropMutate(mutation),
    request: (resources) => mutation.mutateAsync(resources),
  };
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

/** RFC-0007 deterministic entropy — same key, same wallet ⇒ same 32 bytes: `derive(key)`. */
export function useDeriveEntropy(options?: {
  mutation?: MutationOptions<Uint8Array, Uint8Array>;
}): NamedMutation<Uint8Array, Uint8Array> & {
  derive: (key: Uint8Array) => Promise<Uint8Array>;
} {
  const runtime = useRuntime();
  const mutation = useTruapiMutation(
    (key: Uint8Array) => runtime.host.deriveEntropy(key),
    options?.mutation,
  );
  return {
    ...dropMutate(mutation),
    derive: (key: Uint8Array) => mutation.mutateAsync(key),
  };
}

type NotificationId = Awaited<ReturnType<HostController["pushNotification"]>>;

export interface NotificationsApi
  extends NamedMutation<NotificationId, Parameters<HostController["pushNotification"]>[0]> {
  push: (input: Parameters<HostController["pushNotification"]>[0]) => Promise<NotificationId>;
  cancel: (id: NotificationId) => Promise<void>;
}

/** RFC-0019 scheduled push notifications (host-only; throws HostUnavailableError standalone). */
export function useNotifications(): NotificationsApi {
  const runtime = useRuntime();
  const mutation = useTruapiMutation((input: Parameters<HostController["pushNotification"]>[0]) =>
    runtime.host.pushNotification(input),
  );
  return {
    ...dropMutate(mutation),
    push: (input) => mutation.mutateAsync(input),
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
