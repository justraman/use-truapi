import { formatBalance } from "@use-truapi/core";
import { type ComputedRef, computed } from "vue";
import { type MaybeGetter, toGetter } from "../internal";

export interface FormatBalanceOptions {
  decimals?: number;
  maxDecimals?: number;
  symbol?: string;
  locale?: string;
}

/** Format a planck bigint for display, reactively. */
export function useFormattedBalance(
  planck: MaybeGetter<bigint | undefined | null>,
  options?: FormatBalanceOptions,
): ComputedRef<string> {
  const getPlanck = toGetter(planck);
  return computed(() => {
    const value = getPlanck();
    if (value === undefined || value === null) return "";
    return formatBalance(value, options);
  });
}
