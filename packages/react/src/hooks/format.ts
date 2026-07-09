import { formatBalance } from "@use-truapi/core";
import { useMemo } from "react";

export interface FormatBalanceOptions {
  decimals?: number;
  maxDecimals?: number;
  symbol?: string;
  locale?: string;
}

/** Format a planck bigint for display, memoized. */
export function useFormattedBalance(
  planck: bigint | undefined | null,
  options?: FormatBalanceOptions,
): string {
  const { decimals, maxDecimals, symbol, locale } = options ?? {};
  return useMemo(() => {
    if (planck === undefined || planck === null) return "";
    return formatBalance(planck, { decimals, maxDecimals, symbol, locale });
  }, [planck, decimals, maxDecimals, symbol, locale]);
}
