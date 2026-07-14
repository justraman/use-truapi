import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { type HostMode, type ThemeState, queryKeys } from "@use-truapi/core";
import { useCallback } from "react";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type QueryOptions,
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

/** RFC-0002 remote permissions (ChainSubmit, StatementSubmit, Remote domains, …). */
export function usePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestPermission"]>[0]>;
}): UseMutationResult<boolean, Error, Parameters<HostController["requestPermission"]>[0]> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (permission) => runtime.host.requestPermission(permission),
    options?.mutation,
  );
}

/** Device permissions (Camera, Notifications, Clipboard, …). */
export function useDevicePermission(options?: {
  mutation?: MutationOptions<boolean, Parameters<HostController["requestDevicePermission"]>[0]>;
}): UseMutationResult<boolean, Error, Parameters<HostController["requestDevicePermission"]>[0]> {
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
}): UseMutationResult<
  ResourceAllocationResult,
  Error,
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

/** RFC-0007 deterministic entropy — same key, same wallet ⇒ same 32 bytes. */
export function useDeriveEntropy(options?: {
  mutation?: MutationOptions<Uint8Array, Uint8Array>;
}): UseMutationResult<Uint8Array, Error, Uint8Array> {
  const runtime = useRuntime();
  return useTruapiMutation((key) => runtime.host.deriveEntropy(key), options?.mutation);
}

type NotificationId = Awaited<ReturnType<HostController["pushNotification"]>>;

export interface NotificationsApi {
  push: UseMutationResult<NotificationId, Error, Parameters<HostController["pushNotification"]>[0]>;
  cancel: (id: NotificationId) => Promise<void>;
}

/** RFC-0019 scheduled push notifications (host-only; throws HostUnavailableError standalone). */
export function useNotifications(): NotificationsApi {
  const runtime = useRuntime();
  return {
    push: useTruapiMutation((input) => runtime.host.pushNotification(input)),
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
