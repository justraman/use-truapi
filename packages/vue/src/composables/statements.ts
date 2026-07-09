import { type PublishOptions, type ReceivedStatement, toError } from "@use-truapi/core";
import { type Ref, type ShallowRef, onScopeDispose, ref, shallowRef, watch as vueWatch } from "vue";
import { useRuntime } from "../context";
import { type AsyncAction, type MaybeGetter, toGetter, useAsyncAction } from "../internal";

/**
 * Live statements matching the app topic (and optional `topic2`), accumulated
 * newest-last. Empty and inert standalone.
 */
export function useStatements<T>(options?: {
  topic2?: MaybeGetter<string | undefined>;
  limit?: number;
  enabled?: MaybeGetter<boolean>;
}): {
  statements: Ref<ReceivedStatement<T>[]>;
  error: ShallowRef<Error | undefined>;
  clear: () => void;
} {
  const runtime = useRuntime();
  const statements = ref<ReceivedStatement<T>[]>([]) as Ref<ReceivedStatement<T>[]>;
  const error = shallowRef<Error | undefined>(undefined);
  const limit = options?.limit ?? 500;
  const getTopic2 = toGetter(options?.topic2 ?? (() => undefined));
  const enabled = toGetter(options?.enabled ?? true);

  vueWatch(
    [getTopic2, enabled],
    (_next, _prev, onCleanup) => {
      statements.value = [];
      error.value = undefined;
      if (!enabled()) return;
      const topic2 = getTopic2();
      onCleanup(
        runtime.statements.subscribe<T>(
          (statement) => {
            statements.value = [...statements.value.slice(-(limit - 1)), statement];
          },
          {
            ...(topic2 !== undefined ? { topic2 } : {}),
            onError: (e) => {
              error.value = toError(e);
            },
          },
        ),
      );
    },
    { immediate: true },
  );

  return {
    statements,
    error,
    clear: () => {
      statements.value = [];
    },
  };
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
