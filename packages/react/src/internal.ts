import {
  type AsyncState,
  type ReadonlyStore,
  asyncError,
  asyncIdle,
  asyncLoading,
  asyncSuccess,
  toError,
} from "@use-truapi/core";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export function useStore<T>(store: ReadonlyStore<T>): T {
  const subscribe = useCallback((onChange: () => void) => store.subscribe(onChange), [store]);
  return useSyncExternalStore(subscribe, store.get, store.get);
}

export interface AsyncData<T> extends AsyncState<T> {
  isLoading: boolean;
  refetch: () => void;
}

/** Run an async read whenever `deps` change; stale results never land. */
export function useAsyncData<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncData<T> {
  const [state, setState] = useState<AsyncState<T>>(asyncIdle);
  const [epoch, setEpoch] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  // biome-ignore lint/correctness/useExhaustiveDependencies: caller-supplied deps
  useEffect(() => {
    let cancelled = false;
    setState((prev) => asyncLoading(prev));
    fnRef.current().then(
      (data) => {
        if (!cancelled) setState(asyncSuccess(data));
      },
      (error) => {
        if (!cancelled) setState((prev) => asyncError(toError(error), prev));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [epoch, ...deps]);

  return {
    ...state,
    isLoading: state.status === "loading" || state.status === "idle",
    refetch: useCallback(() => setEpoch((n) => n + 1), []),
  };
}

export interface AsyncAction<TArgs extends unknown[], T> extends AsyncState<T> {
  run: (...args: TArgs) => Promise<T>;
  isPending: boolean;
  reset: () => void;
}

/** Mutation-shaped helper: explicit `run`, latest result/error as state. */
export function useAsyncAction<TArgs extends unknown[], T>(
  fn: (...args: TArgs) => Promise<T>,
): AsyncAction<TArgs, T> {
  const [state, setState] = useState<AsyncState<T>>(asyncIdle);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: TArgs): Promise<T> => {
    setState((prev) => asyncLoading(prev));
    try {
      const data = await fnRef.current(...args);
      setState(asyncSuccess(data));
      return data;
    } catch (error) {
      setState((prev) => asyncError(toError(error), prev));
      throw error;
    }
  }, []);

  return {
    ...state,
    run,
    isPending: state.status === "loading",
    reset: useCallback(() => setState(asyncIdle()), []),
  };
}

export interface WatchState<T> extends AsyncState<T> {
  isLoading: boolean;
}

/** Bridge a core `watch*` subscription (attach → unsubscribe) into state. */
export function useWatch<T>(
  attach: (onValue: (value: T) => void, onError: (error: unknown) => void) => () => void,
  deps: readonly unknown[],
  enabled = true,
): WatchState<T> {
  const [state, setState] = useState<AsyncState<T>>(asyncIdle);
  const attachRef = useRef(attach);
  attachRef.current = attach;

  // biome-ignore lint/correctness/useExhaustiveDependencies: caller-supplied deps
  useEffect(() => {
    if (!enabled) {
      setState(asyncIdle());
      return;
    }
    setState((prev) => asyncLoading(prev));
    return attachRef.current(
      (value) => setState(asyncSuccess(value)),
      (error) => setState((prev) => asyncError(toError(error), prev)),
    );
  }, [enabled, ...deps]);

  return useMemo(
    () => ({ ...state, isLoading: state.status === "loading" || state.status === "idle" }),
    [state],
  );
}

/** Accumulate values from a subscription into a bounded list. */
export function useWatchList<T>(
  attach: (onValue: (value: T) => void, onError: (error: unknown) => void) => () => void,
  deps: readonly unknown[],
  options?: { limit?: number; enabled?: boolean },
): { items: T[]; error: Error | undefined; clear: () => void } {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<Error | undefined>(undefined);
  const attachRef = useRef(attach);
  attachRef.current = attach;
  const limit = options?.limit ?? 500;
  const enabled = options?.enabled ?? true;

  // biome-ignore lint/correctness/useExhaustiveDependencies: caller-supplied deps
  useEffect(() => {
    setItems([]);
    setError(undefined);
    if (!enabled) return;
    return attachRef.current(
      (value) => setItems((prev) => [...prev.slice(-(limit - 1)), value]),
      (e) => setError(toError(e)),
    );
  }, [enabled, limit, ...deps]);

  return { items, error, clear: useCallback(() => setItems([]), []) };
}
