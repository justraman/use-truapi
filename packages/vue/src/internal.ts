import { type AsyncStatus, type ReadonlyStore, toError } from "@use-truapi/core";
import {
  type ComputedRef,
  type Ref,
  type ShallowRef,
  type WatchSource,
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  watch as vueWatch,
  watchEffect,
} from "vue";

export function useStore<T>(store: ReadonlyStore<T>): ShallowRef<T> {
  const state = shallowRef(store.get());
  const stop = store.subscribe((value) => {
    state.value = value;
  });
  onScopeDispose(stop);
  return state;
}

export interface AsyncData<T> {
  data: ShallowRef<T | undefined>;
  error: ShallowRef<Error | undefined>;
  status: Ref<AsyncStatus>;
  isLoading: ComputedRef<boolean>;
  refetch: () => void;
}

/** Run an async read reactively; stale results never land. */
export function useAsyncData<T>(fn: () => Promise<T>): AsyncData<T> {
  const data = shallowRef<T | undefined>(undefined);
  const error = shallowRef<Error | undefined>(undefined);
  const status = ref<AsyncStatus>("idle");
  const epoch = ref(0);

  watchEffect((onCleanup) => {
    void epoch.value;
    let cancelled = false;
    onCleanup(() => {
      cancelled = true;
    });
    status.value = "loading";
    error.value = undefined;
    fn().then(
      (value) => {
        if (cancelled) return;
        data.value = value;
        status.value = "success";
      },
      (e) => {
        if (cancelled) return;
        error.value = toError(e);
        status.value = "error";
      },
    );
  });

  return {
    data,
    error,
    status,
    isLoading: computed(() => status.value === "loading" || status.value === "idle"),
    refetch: () => {
      epoch.value++;
    },
  };
}

export interface AsyncAction<TArgs extends unknown[], T> {
  run: (...args: TArgs) => Promise<T>;
  data: ShallowRef<T | undefined>;
  error: ShallowRef<Error | undefined>;
  status: Ref<AsyncStatus>;
  isPending: ComputedRef<boolean>;
  reset: () => void;
}

/** Mutation-shaped helper: explicit `run`, latest result/error as refs. */
export function useAsyncAction<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
): AsyncAction<TArgs, T> {
  const data = shallowRef<T | undefined>(undefined);
  const error = shallowRef<Error | undefined>(undefined);
  const status = ref<AsyncStatus>("idle");

  return {
    data,
    error,
    status,
    isPending: computed(() => status.value === "loading"),
    run: async (...args: TArgs): Promise<T> => {
      status.value = "loading";
      error.value = undefined;
      try {
        const value = await fn(...args);
        data.value = value;
        status.value = "success";
        return value;
      } catch (e) {
        error.value = toError(e);
        status.value = "error";
        throw e;
      }
    },
    reset: () => {
      data.value = undefined;
      error.value = undefined;
      status.value = "idle";
    },
  };
}

export interface WatchState<T> {
  data: ShallowRef<T | undefined>;
  error: ShallowRef<Error | undefined>;
  status: Ref<AsyncStatus>;
  isLoading: ComputedRef<boolean>;
}

/** Bridge a core `watch*` subscription (attach → unsubscribe) into refs. */
export function useSubscription<T>(
  attach: (onValue: (value: T) => void, onError: (error: unknown) => void) => () => void,
  sources: WatchSource[] = [],
  enabled: () => boolean = () => true,
): WatchState<T> {
  const data = shallowRef<T | undefined>(undefined);
  const error = shallowRef<Error | undefined>(undefined);
  const status = ref<AsyncStatus>("idle");

  vueWatch(
    [...sources, enabled],
    (_next, _prev, onCleanup) => {
      if (!enabled()) {
        status.value = "idle";
        return;
      }
      status.value = "loading";
      error.value = undefined;
      const stop = attach(
        (value) => {
          data.value = value;
          status.value = "success";
        },
        (e) => {
          error.value = toError(e);
          status.value = "error";
        },
      );
      onCleanup(stop);
    },
    { immediate: true },
  );

  return {
    data,
    error,
    status,
    isLoading: computed(() => status.value === "loading" || status.value === "idle"),
  };
}

/** Accumulate values from a subscription into a bounded reactive list. */
export function useSubscriptionList<T>(
  attach: (onValue: (value: T) => void, onError: (error: unknown) => void) => () => void,
  sources: WatchSource[] = [],
  options?: { limit?: number; enabled?: () => boolean },
): { items: Ref<T[]>; error: ShallowRef<Error | undefined>; clear: () => void } {
  const items = ref<T[]>([]) as Ref<T[]>;
  const error = shallowRef<Error | undefined>(undefined);
  const limit = options?.limit ?? 500;
  const enabled = options?.enabled ?? (() => true);

  vueWatch(
    [...sources, enabled],
    (_next, _prev, onCleanup) => {
      items.value = [];
      error.value = undefined;
      if (!enabled()) return;
      const stop = attach(
        (value) => {
          items.value = [...items.value.slice(-(limit - 1)), value];
        },
        (e) => {
          error.value = toError(e);
        },
      );
      onCleanup(stop);
    },
    { immediate: true },
  );

  return {
    items,
    error,
    clear: () => {
      items.value = [];
    },
  };
}

export type MaybeGetter<T> = T | (() => T);
export const toGetter = <T>(value: MaybeGetter<T>): (() => T) =>
  typeof value === "function" ? (value as () => T) : () => value;
