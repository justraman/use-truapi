import type {
  PaymentBalance,
  PaymentPurseId,
  PaymentStatus,
  PaymentTopUpSource,
} from "@use-truapi/core";
import { useRuntime } from "../context";
import { type AsyncAction, type WatchState, useAsyncAction, useWatch } from "../internal";

/** Live RFC-0006 payment balance (host-only; errors standalone). */
export function usePaymentBalance(options?: {
  purse?: PaymentPurseId;
  enabled?: boolean;
}): WatchState<PaymentBalance> {
  const runtime = useRuntime();
  return useWatch<PaymentBalance>(
    (onValue, onError) =>
      runtime.payments.watchBalance(onValue, {
        ...(options?.purse !== undefined ? { purse: options.purse } : {}),
        onError,
      }),
    [runtime, options?.purse],
    options?.enabled ?? true,
  );
}

/** Request a payment from the user — the host shows the confirmation UI. */
export function useRequestPayment(): AsyncAction<
  [amount: bigint, destination: `0x${string}`, from?: PaymentPurseId],
  { id: string }
> {
  const runtime = useRuntime();
  return useAsyncAction((amount: bigint, destination: `0x${string}`, from?: PaymentPurseId) =>
    runtime.payments.request(amount, destination, from),
  );
}

/** Top up the payment balance from a product account or provided keys. */
export function useTopUp(): AsyncAction<
  [amount: bigint, source: PaymentTopUpSource, into?: PaymentPurseId],
  void
> {
  const runtime = useRuntime();
  return useAsyncAction((amount: bigint, source: PaymentTopUpSource, into?: PaymentPurseId) =>
    runtime.payments.topUp(amount, source, into),
  );
}

/** Track a payment to its terminal state (Processing → Completed | Failed). */
export function usePaymentStatus(paymentId: string | undefined): WatchState<PaymentStatus> {
  const runtime = useRuntime();
  return useWatch<PaymentStatus>(
    (onValue, onError) => runtime.payments.watchStatus(paymentId ?? "", onValue, { onError }),
    [runtime, paymentId],
    paymentId !== undefined,
  );
}
