import type {
  AnyBatchCall,
  AnyTx,
  BatchMode,
  SubmitOptions,
  TxPhase,
  TxResult,
  TypedApiOf,
} from "@use-truapi/core";
import { toError } from "@use-truapi/core";
import { useCallback, useState } from "react";
import { type ChainKey, type ResolvedChains, useRuntime } from "../context";

export interface UseTxResult<K extends ChainKey> {
  /**
   * Build against the typed api and submit; resolves when the tx reaches
   * best-block (or `waitFor: "finalized"`).
   */
  submit: (
    build: (api: TypedApiOf<ResolvedChains, K>) => AnyTx | Promise<AnyTx>,
    options?: SubmitOptions,
  ) => Promise<TxResult>;
  /** "idle" → "signing" → "broadcasting" → "in-block" → "finalized" | "error". */
  phase: TxPhase;
  result: TxResult | undefined;
  error: Error | undefined;
  isPending: boolean;
  reset: () => void;
}

/**
 * Transaction lifecycle as hook state. Permission (`ChainSubmit`) and signer
 * connection are handled automatically on first submit.
 *
 * ```ts
 * const { submit, phase } = useTx();
 * await submit((api) => api.tx.Balances.transfer_keep_alive({ dest, value }));
 * ```
 */
export function useTx<K extends ChainKey = ChainKey>(options?: { chain?: K }): UseTxResult<K> {
  const runtime = useRuntime();
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [result, setResult] = useState<TxResult | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const chain = options?.chain;

  const submit: UseTxResult<K>["submit"] = useCallback(
    async (build, submitOptions) => {
      setPhase("signing");
      setResult(undefined);
      setError(undefined);
      try {
        const txResult = await runtime.tx.submit(build as never, {
          ...submitOptions,
          ...(chain !== undefined ? { chain } : {}),
          onStatus: (status) => {
            setPhase(status);
            submitOptions?.onStatus?.(status);
          },
        });
        setResult(txResult);
        setPhase(
          txResult.ok
            ? submitOptions?.waitFor === "finalized"
              ? "finalized"
              : "in-block"
            : "error",
        );
        return txResult;
      } catch (e) {
        setError(toError(e));
        setPhase("error");
        throw e;
      }
    },
    [runtime, chain],
  );

  return {
    submit,
    phase,
    result,
    error,
    isPending: phase === "signing" || phase === "broadcasting" || phase === "in-block",
    reset: useCallback(() => {
      setPhase("idle");
      setResult(undefined);
      setError(undefined);
    }, []),
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
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [result, setResult] = useState<TxResult | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const chain = options?.chain;

  const submit: UseBatchTxResult<K>["submit"] = useCallback(
    async (build, submitOptions) => {
      setPhase("signing");
      setResult(undefined);
      setError(undefined);
      try {
        const txResult = await runtime.tx.submitBatch(build as never, {
          ...submitOptions,
          ...(chain !== undefined ? { chain } : {}),
          onStatus: (status) => {
            setPhase(status);
            submitOptions?.onStatus?.(status);
          },
        });
        setResult(txResult);
        setPhase(
          txResult.ok
            ? submitOptions?.waitFor === "finalized"
              ? "finalized"
              : "in-block"
            : "error",
        );
        return txResult;
      } catch (e) {
        setError(toError(e));
        setPhase("error");
        throw e;
      }
    },
    [runtime, chain],
  );

  return {
    submit,
    phase,
    result,
    error,
    isPending: phase === "signing" || phase === "broadcasting" || phase === "in-block",
    reset: useCallback(() => {
      setPhase("idle");
      setResult(undefined);
      setError(undefined);
    }, []),
  };
}
