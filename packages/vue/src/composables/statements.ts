import { type PublishOptions, type ReceivedStatement, queryKeys } from "@use-truapi/core";
import { type Ref, onScopeDispose, ref } from "vue";
import { useRuntime } from "../context";
import {
  type LiveListQueryResult,
  type MaybeGetter,
  type MutationOptions,
  type MutationResult,
  type QueryOptions,
  toGetter,
  useLiveListQuery,
  useTruapiMutation,
} from "../internal";

/**
 * Live statements matching the app topic (and optional `topic2`), accumulated
 * newest-last in the query cache. Empty and inert standalone.
 */
export function useStatements<T>(options?: {
  topic2?: MaybeGetter<string | undefined>;
  limit?: number;
  enabled?: MaybeGetter<boolean>;
  query?: QueryOptions<ReceivedStatement<T>[]>;
}): LiveListQueryResult<ReceivedStatement<T>> {
  const runtime = useRuntime();
  const getTopic2 = toGetter(options?.topic2 ?? (() => undefined));
  return useLiveListQuery<ReceivedStatement<T>>({
    queryKey: () => queryKeys.statements(getTopic2() ?? null),
    attach: (onValue, onError) => {
      const topic2 = getTopic2();
      return runtime.statements.subscribe<T>(onValue, {
        ...(topic2 !== undefined ? { topic2 } : {}),
        onError,
      });
    },
    limit: options?.limit ?? 500,
    enabled: options?.enabled ?? true,
    ...(options?.query !== undefined ? { query: options.query } : {}),
  });
}

export interface PublishStatementVariables<T> {
  data: T;
  options?: PublishOptions;
}

/**
 * Publish JSON payloads (≤512 bytes) to the app topic:
 * `mutate({ data })`. Resolves `false` when the store rejects the statement
 * or the app runs standalone.
 */
export function usePublishStatement<T = unknown>(options?: {
  mutation?: MutationOptions<boolean, PublishStatementVariables<T>>;
}): MutationResult<boolean, PublishStatementVariables<T>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ data, options: publishOptions }: PublishStatementVariables<T>) =>
      runtime.statements.publish(data, publishOptions),
    options?.mutation,
  );
}

export interface StatementChannel<T> {
  /** Latest value per channel name (last-write-wins). */
  values: Ref<ReadonlyMap<string, T>>;
  write: (channelName: string, value: T) => Promise<boolean>;
  ready: Ref<boolean>;
}

/**
 * Last-write-wins channels (presence, live cursors, ephemeral app state).
 * `ready` stays false standalone.
 */
export function useStatementChannel<T extends { timestamp?: number }>(options?: {
  topic2?: string;
}): StatementChannel<T> {
  const runtime = useRuntime();
  const values = ref<ReadonlyMap<string, T>>(new Map()) as Ref<ReadonlyMap<string, T>>;
  const ready = ref(false);
  let store: Awaited<ReturnType<typeof runtime.statements.getChannelStore<T>>> = null;
  let cancelled = false;
  let offChange: (() => void) | undefined;

  void runtime.statements
    .getChannelStore<T>(options?.topic2 !== undefined ? { topic2: options.topic2 } : undefined)
    .then((resolved) => {
      if (cancelled || !resolved) return;
      store = resolved;
      ready.value = true;
      values.value = new Map(resolved.readAll());
      const sub = resolved.onChange(() => {
        values.value = new Map(resolved.readAll());
      });
      offChange = () => sub.unsubscribe();
    })
    .catch(() => {});

  onScopeDispose(() => {
    cancelled = true;
    offChange?.();
    store?.destroy();
    store = null;
  });

  return {
    values,
    ready,
    write: async (channelName: string, value: T) => {
      if (!store) return false;
      return store.write(channelName, value);
    },
  };
}
