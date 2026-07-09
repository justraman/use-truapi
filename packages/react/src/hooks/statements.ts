import type { PublishOptions, ReceivedStatement } from "@use-truapi/core";
import { toError } from "@use-truapi/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRuntime } from "../context";
import { type AsyncAction, useAsyncAction } from "../internal";

/**
 * Live statements matching the app topic (and optional `topic2`), accumulated
 * newest-last. Empty and inert standalone.
 */
export function useStatements<T>(options?: {
  topic2?: string;
  limit?: number;
  enabled?: boolean;
}): { statements: ReceivedStatement<T>[]; error: Error | undefined; clear: () => void } {
  const runtime = useRuntime();
  const [statements, setStatements] = useState<ReceivedStatement<T>[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const limit = options?.limit ?? 500;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    setStatements([]);
    setError(undefined);
    if (!enabled) return;
    return runtime.statements.subscribe<T>(
      (statement) => setStatements((prev) => [...prev.slice(-(limit - 1)), statement]),
      {
        ...(options?.topic2 !== undefined ? { topic2: options.topic2 } : {}),
        onError: (e) => setError(toError(e)),
      },
    );
  }, [runtime, options?.topic2, limit, enabled]);

  return { statements, error, clear: useCallback(() => setStatements([]), []) };
}

/**
 * Publish JSON payloads (≤512 bytes) to the app topic. Resolves `false` when
 * the store rejects the statement or the app runs standalone.
 */
export function usePublishStatement<T = unknown>(): AsyncAction<
  [data: T, options?: PublishOptions],
  boolean
> {
  const runtime = useRuntime();
  return useAsyncAction((data: T, options?: PublishOptions) =>
    runtime.statements.publish(data, options),
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
