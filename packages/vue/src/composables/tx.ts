import {
  type AnyBatchCall,
  type AnyTx,
  type BatchMode,
  type SubmitOptions,
  type TxPhase,
  type TxResult,
  type TypedApiOf,
  toError,
} from "@use-truapi/core";
import { type ComputedRef, type Ref, type ShallowRef, computed, ref, shallowRef } from "vue";
import { type ChainKey, type ResolvedChains, useRuntime } from "../context";

export interface UseTxResult<K extends ChainKey> {
  submit: (
    build: (api: TypedApiOf<ResolvedChains, K>) => AnyTx | Promise<AnyTx>,
    options?: SubmitOptions,
  ) => Promise<TxResult>;
  /** "idle" → "signing" → "broadcasting" → "in-block" → "finalized" | "error". */
  phase: Ref<TxPhase>;
  result: ShallowRef<TxResult | undefined>;
  error: ShallowRef<Error | undefined>;
  isPending: ComputedRef<boolean>;
  reset: () => void;
}

/**
 * Transaction lifecycle as reactive state. Permission (`ChainSubmit`) and
 * signer connection are handled automatically on first submit.
 */
export function useTx<K extends ChainKey = ChainKey>(options?: { chain?: K }): UseTxResult<K> {
  const runtime = useRuntime();
  const phase = ref<TxPhase>("idle");
  const result = shallowRef<TxResult | undefined>(undefined);
  const error = shallowRef<Error | undefined>(undefined);
  const chain = options?.chain;

  return {
    phase,
    result,
    error,
    isPending: computed(
      () =>
        phase.value === "signing" || phase.value === "broadcasting" || phase.value === "in-block",
    ),
    submit: async (build, submitOptions) => {
      phase.value = "signing";
      result.value = undefined;
      error.value = undefined;
      try {
        const txResult = await runtime.tx.submit(build as never, {
          ...submitOptions,
          ...(chain !== undefined ? { chain } : {}),
          onStatus: (status) => {
            phase.value = status;
            submitOptions?.onStatus?.(status);
          },
        });
        result.value = txResult;
        phase.value = txResult.ok
          ? submitOptions?.waitFor === "finalized"
            ? "finalized"
            : "in-block"
          : "error";
        return txResult;
      } catch (e) {
        error.value = toError(e);
        phase.value = "error";
        throw e;
      }
    },
    reset: () => {
      phase.value = "idle";
      result.value = undefined;
      error.value = undefined;
    },
  };
}

export interface UseBatchTxResult<K extends ChainKey> extends Omit<UseTxResult<K>, "submit"> {
  submit: (
    build: (api: TypedApiOf<ResolvedChains, K>) => AnyBatchCall[] | Promise<AnyBatchCall[]>,
    options?: SubmitOptions & { mode?: BatchMode },
  ) => Promise<TxResult>;
}

/** Like `useTx` but wraps the built calls in `Utility.batch_all` (atomic by default). */
export function useBatchTx<K extends ChainKey = ChainKey>(options?: {
  chain?: K;
}): UseBatchTxResult<K> {
  const runtime = useRuntime();
  const phase = ref<TxPhase>("idle");
  const result = shallowRef<TxResult | undefined>(undefined);
  const error = shallowRef<Error | undefined>(undefined);
  const chain = options?.chain;

  return {
    phase,
    result,
    error,
    isPending: computed(
      () =>
        phase.value === "signing" || phase.value === "broadcasting" || phase.value === "in-block",
    ),
    submit: async (build, submitOptions) => {
      phase.value = "signing";
      result.value = undefined;
      error.value = undefined;
      try {
        const txResult = await runtime.tx.submitBatch(build as never, {
          ...submitOptions,
          ...(chain !== undefined ? { chain } : {}),
          onStatus: (status) => {
            phase.value = status;
            submitOptions?.onStatus?.(status);
          },
        });
        result.value = txResult;
        phase.value = txResult.ok
          ? submitOptions?.waitFor === "finalized"
            ? "finalized"
            : "in-block"
          : "error";
        return txResult;
      } catch (e) {
        error.value = toError(e);
        phase.value = "error";
        throw e;
      }
    },
    reset: () => {
      phase.value = "idle";
      result.value = undefined;
      error.value = undefined;
    },
  };
}
