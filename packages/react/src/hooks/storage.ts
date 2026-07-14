import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  type AuthorizationStatus,
  type StoreResult,
  type UploadOptions,
  queryKeys,
} from "@use-truapi/core";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type QueryOptions,
  useTruapiMutation,
  useTruapiQuery,
} from "../internal";

export interface UploadVariables {
  data: Uint8Array;
  options?: UploadOptions;
}

/** Upload bytes to Bulletin-backed cloud storage: `mutate({ data })` → CID receipt. */
export function useUpload(options?: {
  mutation?: MutationOptions<StoreResult, UploadVariables>;
}): UseMutationResult<StoreResult, Error, UploadVariables> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ data, options: uploadOptions }: UploadVariables) =>
      runtime.cloudStorage.upload(data, uploadOptions),
    options?.mutation,
  );
}

/** Fetch CID content (host preimage lookup). Set `json` to parse. */
export function useCid<T = Uint8Array>(
  cid: string | undefined,
  options?: { json?: boolean; query?: QueryOptions<T> },
): UseQueryResult<T, Error> {
  const runtime = useRuntime();
  return useTruapiQuery<T>(
    queryKeys.cid(cid ?? null, options?.json ?? false),
    async () => {
      if (!cid) throw new Error("use-truapi: useCid needs a cid");
      return options?.json
        ? runtime.cloudStorage.fetchJson<T>(cid)
        : ((await runtime.cloudStorage.fetchBytes(cid)) as T);
    },
    { ...options, enabled: cid !== undefined },
  );
}

/** Storage quota/authorization for the selected (or given) account. */
export function useStorageAuthorization(
  address?: string,
  options?: { query?: QueryOptions<AuthorizationStatus> },
): UseQueryResult<AuthorizationStatus, Error> {
  const runtime = useRuntime();
  return useTruapiQuery(
    queryKeys.storageAuthorization(address ?? null),
    () => runtime.cloudStorage.checkAuthorization(address),
    options,
  );
}
