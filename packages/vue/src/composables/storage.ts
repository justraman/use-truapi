import type { AuthorizationStatus, StoreResult, UploadOptions } from "@use-truapi/core";
import { useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  type MaybeGetter,
  toGetter,
  useAsyncAction,
  useAsyncData,
} from "../internal";

/** Upload bytes to Bulletin-backed cloud storage; resolves with the CID receipt. */
export function useUpload(): AsyncAction<[data: Uint8Array, options?: UploadOptions], StoreResult> {
  const runtime = useRuntime();
  return useAsyncAction((data: Uint8Array, options?: UploadOptions) =>
    runtime.cloudStorage.upload(data, options),
  );
}

/** Fetch CID content (host preimage lookup). Set `json` to parse. */
export function useCid<T = Uint8Array>(
  cid: MaybeGetter<string | undefined>,
  options?: { json?: boolean },
): AsyncData<T> {
  const runtime = useRuntime();
  const getCid = toGetter(cid);
  return useAsyncData(async () => {
    const resolved = getCid();
    if (!resolved) return undefined as T;
    return options?.json
      ? runtime.cloudStorage.fetchJson<T>(resolved)
      : ((await runtime.cloudStorage.fetchBytes(resolved)) as T);
  });
}

/** Storage quota/authorization for the selected (or given) account. */
export function useStorageAuthorization(
  address?: MaybeGetter<string | undefined>,
): AsyncData<AuthorizationStatus> {
  const runtime = useRuntime();
  const getAddress = toGetter(address ?? (() => undefined));
  return useAsyncData(() => runtime.cloudStorage.checkAuthorization(getAddress()));
}
