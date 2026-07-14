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
  type MaybeGetter,
  type MutationOptions,
  type MutationResult,
  type QueryOptions,
  type QueryResult,
  toGetter,
  useLiveQuery,
  useTruapiMutation,
} from "../internal";

/** Live RFC-0006 payment balance (host-only; errors standalone). */
export function usePaymentBalance(options?: {
  purse?: PaymentPurseId;
  enabled?: MaybeGetter<boolean>;
  query?: QueryOptions<PaymentBalance>;
}): QueryResult<PaymentBalance> {
  const runtime = useRuntime();
  return useLiveQuery<PaymentBalance>({
    queryKey: () => queryKeys.paymentBalance(toKeyPart(options?.purse)),
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
}): MutationResult<{ id: string }, RequestPaymentVariables> {
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
}): MutationResult<void, TopUpVariables> {
  const runtime = useRuntime();
  return useTruapiMutation(
    ({ amount, source, into }: TopUpVariables) => runtime.payments.topUp(amount, source, into),
    options?.mutation,
  );
}

/** Track a payment to its terminal state (Processing → Completed | Failed). */
export function usePaymentStatus(
  paymentId: MaybeGetter<string | undefined>,
  options?: { query?: QueryOptions<PaymentStatus> },
): QueryResult<PaymentStatus> {
  const runtime = useRuntime();
  const getId = toGetter(paymentId);
  return useLiveQuery<PaymentStatus>({
    queryKey: () => queryKeys.paymentStatus(getId() ?? ""),
    attach: (onValue, onError) => runtime.payments.watchStatus(getId() ?? "", onValue, { onError }),
    enabled: () => getId() !== undefined,
    ...(options?.query !== undefined ? { query: options.query } : {}),
  });
}
