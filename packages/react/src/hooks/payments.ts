import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  type PaymentBalance,
  type PaymentPurseId,
  type PaymentStatus,
  type PaymentTopUpSource,
  queryKeys,
  toKeyPart,
} from "@use-truapi/core";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type QueryOptions,
  useLiveQuery,
  useTruapiMutation,
} from "../internal";

/** Live RFC-0006 payment balance (host-only; errors standalone). */
export function usePaymentBalance(options?: {
  purse?: PaymentPurseId;
  enabled?: boolean;
  query?: QueryOptions<PaymentBalance>;
}): UseQueryResult<PaymentBalance, Error> {
  const runtime = useRuntime();
  return useLiveQuery<PaymentBalance>({
    queryKey: queryKeys.paymentBalance(toKeyPart(options?.purse)),
    attach: (onValue, onError) =>
      runtime.payments.watchBalance(onValue, {
        ...(options?.purse !== undefined ? { purse: options.purse } : {}),
        onError,
      }),
    enabled: options?.enabled ?? true,
    ...(options?.query !== undefined ? { query: options.query } : {}),
  });
}

export interface RequestPaymentVariables {
  amount: bigint;
  destination: `0x${string}`;
  from?: PaymentPurseId;
}

/** Request a payment from the user — the host shows the confirmation UI. */
export function useRequestPayment(options?: {
  mutation?: MutationOptions<{ id: string }, RequestPaymentVariables>;
}): UseMutationResult<{ id: string }, Error, RequestPaymentVariables> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ amount, destination, from }: RequestPaymentVariables) =>
      runtime.payments.request(amount, destination, from),
    options?.mutation,
  );
}

export interface TopUpVariables {
  amount: bigint;
  source: PaymentTopUpSource;
  into?: PaymentPurseId;
}

/** Top up the payment balance from a product account or provided keys. */
export function useTopUp(options?: {
  mutation?: MutationOptions<void, TopUpVariables>;
}): UseMutationResult<void, Error, TopUpVariables> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ amount, source, into }: TopUpVariables) => runtime.payments.topUp(amount, source, into),
    options?.mutation,
  );
}

/** Track a payment to its terminal state (Processing → Completed | Failed). */
export function usePaymentStatus(
  paymentId: string | undefined,
  options?: { query?: QueryOptions<PaymentStatus> },
): UseQueryResult<PaymentStatus, Error> {
  const runtime = useRuntime();
  return useLiveQuery<PaymentStatus>({
    queryKey: queryKeys.paymentStatus(paymentId ?? ""),
    attach: (onValue, onError) =>
      runtime.payments.watchStatus(paymentId ?? "", onValue, { onError }),
    enabled: paymentId !== undefined,
    ...(options?.query !== undefined ? { query: options.query } : {}),
  });
}
