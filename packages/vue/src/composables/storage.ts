import {
  type AuthorizationStatus,
  type StoreResult,
  type UploadOptions,
  queryKeys,
} from "@use-truapi/core";
import { useRuntime } from "../context";
import {
  type MaybeGetter,
  type MutationOptions,
  type MutationResult,
  type QueryOptions,
  type QueryResult,
  toGetter,
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
}): MutationResult<StoreResult, UploadVariables> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ data, options: uploadOptions }: UploadVariables) =>
      runtime.cloudStorage.upload(data, uploadOptions),
    options?.mutation,
  );
}

/** Fetch CID content (host preimage lookup). Set `json` to parse. */
export function useCid<T = Uint8Array>(
  cid: MaybeGetter<string | undefined>,
  options?: { json?: boolean; query?: QueryOptions<T> },
): QueryResult<T> {
  const runtime = useRuntime();
  const getCid = toGetter(cid);
  return useTruapiQuery<T>(
    () => queryKeys.cid(getCid() ?? null, options?.json ?? false),
    async () => {
      const resolved = getCid();
      if (!resolved) throw new Error("use-truapi: useCid needs a cid");
      return options?.json
        ? runtime.cloudStorage.fetchJson<T>(resolved)
        : ((await runtime.cloudStorage.fetchBytes(resolved)) as T);
    },
    { ...options, enabled: () => getCid() !== undefined },
  );
}

/** Storage quota/authorization for the selected (or given) account. */
export function useStorageAuthorization(
  address?: MaybeGetter<string | undefined>,
  options?: { query?: QueryOptions<AuthorizationStatus> },
): QueryResult<AuthorizationStatus> {
  const runtime = useRuntime();
  const getAddress = toGetter(address ?? (() => undefined));
  return useTruapiQuery(
    () => queryKeys.storageAuthorization(getAddress() ?? null),
    () => runtime.cloudStorage.checkAuthorization(getAddress()),
    options,
  );
}
