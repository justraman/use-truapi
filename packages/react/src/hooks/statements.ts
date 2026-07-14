import type { UseMutationResult } from "@tanstack/react-query";
import { type PublishOptions, type ReceivedStatement, queryKeys } from "@use-truapi/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntime } from "../context";
import {
  type LiveListQueryResult,
  type MutationOptions,
  type QueryOptions,
  useLiveListQuery,
  useTruapiMutation,
} from "../internal";

/**
 * Live statements matching the app topic (and optional `topic2`), accumulated
 * newest-last in the query cache. Empty and inert standalone.
 */
export function useStatements<T>(options?: {
  topic2?: string;
  limit?: number;
  enabled?: boolean;
  query?: QueryOptions<ReceivedStatement<T>[]>;
}): LiveListQueryResult<ReceivedStatement<T>> {
  const runtime = useRuntime();
  return useLiveListQuery<ReceivedStatement<T>>({
    queryKey: queryKeys.statements(options?.topic2 ?? null),
    attach: (onValue, onError) =>
      runtime.statements.subscribe<T>(onValue, {
        ...(options?.topic2 !== undefined ? { topic2: options.topic2 } : {}),
        onError,
      }),
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
}): UseMutationResult<boolean, Error, PublishStatementVariables<T>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ data, options: publishOptions }: PublishStatementVariables<T>) =>
      runtime.statements.publish(data, publishOptions),
    options?.mutation,
  );
}

export interface StatementChannel<T> {
  /** Latest value per channel name (last-write-wins). */
  values: ReadonlyMap<string, T>;
  write: (channelName: string, value: T) => Promise<boolean>;
  ready: boolean;
}

/**
 * Last-write-wins channels (presence, live cursors, ephemeral app state).
 * `ready` stays false standalone.
 */
export function useStatementChannel<T extends { timestamp?: number }>(options?: {
  topic2?: string;
}): StatementChannel<T> {
  const runtime = useRuntime();
  const [values, setValues] = useState<ReadonlyMap<string, T>>(new Map());
  const [ready, setReady] = useState(false);
  const storeRef = useRef<Awaited<ReturnType<typeof runtime.statements.getChannelStore<T>>>>(null);

  useEffect(() => {
    let cancelled = false;
    let offChange: (() => void) | undefined;
    void runtime.statements
      .getChannelStore<T>(options?.topic2 !== undefined ? { topic2: options.topic2 } : undefined)
      .then((store) => {
        if (cancelled || !store) return;
        storeRef.current = store;
        setReady(true);
        setValues(new Map(store.readAll()));
        const sub = store.onChange(() => setValues(new Map(store.readAll())));
        offChange = () => sub.unsubscribe();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      offChange?.();
      storeRef.current?.destroy();
      storeRef.current = null;
      setReady(false);
    };
  }, [runtime, options?.topic2]);

  return {
    values,
    ready,
    write: useCallback(async (channelName: string, value: T) => {
      const store = storeRef.current;
      if (!store) return false;
      return store.write(channelName, value);
    }, []),
  };
}
