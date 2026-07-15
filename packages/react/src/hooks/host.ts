import type { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { type HostMode, type ThemeState, queryKeys } from "@use-truapi/core";
import { useCallback } from "react";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type NamedMutation,
  type QueryOptions,
  dropMutate,
  useStore,
  useTruapiMutation,
  useTruapiQuery,
} from "../internal";

type HostController = ReturnType<typeof useRuntime>["host"];

/** `"unknown"` until async detection resolves, then `"host"` | `"standalone"`. */
export function useHostMode(): HostMode {
  return useStore(useRuntime().host.mode);
}

/** False while detection is pending — gate host-only UI on `useHostMode()` if the distinction matters. */
export function useIsHost(): boolean {
  return useHostMode() === "host";
}

/** Live theme: host theme when embedded, `prefers-color-scheme` standalone. */
export function useTheme(): ThemeState {
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
  const { mutateAsync } = mutation;
  return {
    ...dropMutate(mutation),
    request: useCallback((permission) => mutateAsync(permission), [mutateAsync]),
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
  const { mutateAsync } = mutation;
  return {
    ...dropMutate(mutation),
    request: useCallback((kind) => mutateAsync(kind), [mutateAsync]),
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
  const { mutateAsync } = mutation;
  return {
    ...dropMutate(mutation),
    request: useCallback((resources) => mutateAsync(resources), [mutateAsync]),
  };
}

/** Host deep-link navigation: `.dot` routes in-container, `https://` external. */
export function useHostNavigate(): (url: string) => Promise<void> {
  const runtime = useRuntime();
  return useCallback((url: string) => runtime.host.navigate(url), [runtime]);
}

export function useFeatureSupported(
  feature: Parameters<HostController["featureSupported"]>[0] | undefined,
  options?: { query?: QueryOptions<boolean> },
): UseQueryResult<boolean, Error> {
  const runtime = useRuntime();
  return useTruapiQuery(
    queryKeys.featureSupported(feature),
    () => (feature ? runtime.host.featureSupported(feature) : Promise.resolve(false)),
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
  const { mutateAsync } = mutation;
  return {
    ...dropMutate(mutation),
    derive: useCallback((key: Uint8Array) => mutateAsync(key), [mutateAsync]),
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
  const { mutateAsync } = mutation;
  return {
    ...dropMutate(mutation),
    push: useCallback((input) => mutateAsync(input), [mutateAsync]),
    cancel: useCallback((id) => runtime.host.cancelNotification(id), [runtime]),
  };
}

export type HostStorageValue<T> = UseQueryResult<T | null, Error> & {
  set: (value: T) => Promise<void>;
  remove: () => Promise<void>;
};

/**
 * Product-scoped KV storage: host localStorage inside a container, browser
 * localStorage standalone. JSON-serialized. Writes update the query cache
 * in place under `queryKeys.hostStorage(key)`.
 */
export function useHostStorage<T>(
  key: string,
  options?: { query?: QueryOptions<T | null> },
): HostStorageValue<T> {
  const runtime = useRuntime();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.hostStorage(key);
  const data = useTruapiQuery<T | null>(
    queryKey,
    () => runtime.host.storage.getJSON<T>(key),
    options,
  );
  const set = useCallback(
    async (value: T) => {
      await runtime.host.storage.setJSON(key, value);
      queryClient.setQueryData(queryKeys.hostStorage(key), value);
    },
    [runtime, key, queryClient],
  );
  const remove = useCallback(async () => {
    await runtime.host.storage.remove(key);
    queryClient.setQueryData(queryKeys.hostStorage(key), null);
  }, [runtime, key, queryClient]);
  return { ...data, set, remove };
}
