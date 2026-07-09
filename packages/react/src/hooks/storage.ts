import type { AuthorizationStatus, StoreResult, UploadOptions } from "@use-truapi/core";
import { useRuntime } from "../context";
import { type AsyncAction, type AsyncData, useAsyncAction, useAsyncData } from "../internal";

/** Upload bytes to Bulletin-backed cloud storage; resolves with the CID receipt. */
export function useUpload(): AsyncAction<[data: Uint8Array, options?: UploadOptions], StoreResult> {
  const runtime = useRuntime();
  return useAsyncAction((data: Uint8Array, options?: UploadOptions) =>
    runtime.cloudStorage.upload(data, options),
  );
}

/** Fetch CID content (host preimage lookup). Set `json` to parse. */
export function useCid<T = Uint8Array>(
  cid: string | undefined,
  options?: { json?: boolean },
): AsyncData<T> {
  const runtime = useRuntime();
  return useAsyncData(async () => {
    if (!cid) return undefined as T;
    return options?.json
      ? runtime.cloudStorage.fetchJson<T>(cid)
      : ((await runtime.cloudStorage.fetchBytes(cid)) as T);
  }, [runtime, cid, options?.json]);
}

/** Storage quota/authorization for the selected (or given) account. */
export function useStorageAuthorization(address?: string): AsyncData<AuthorizationStatus> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.cloudStorage.checkAuthorization(address), [runtime, address]);
}
