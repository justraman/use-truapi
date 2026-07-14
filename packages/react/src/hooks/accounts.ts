import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import {
  type LoginResult,
  type ProviderType,
  type SignerAccount,
  type SignerError,
  type SignerState,
  queryKeys,
} from "@use-truapi/core";
import type { PolkadotSigner } from "polkadot-api";
import { useCallback } from "react";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type OptionalVariables,
  type QueryOptions,
  useStore,
  useTruapiMutation,
  useTruapiQuery,
} from "../internal";

export interface AccountsResult {
  accounts: readonly SignerAccount[];
  selectedAccount: SignerAccount | null;
  status: SignerState["status"];
  error: SignerError | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (provider?: ProviderType) => Promise<SignerAccount[]>;
  disconnect: () => void;
  select: (address: string) => SignerAccount;
}

/** Wallet state + connect/disconnect/select, backed by the shared SignerManager. */
export function useAccounts(): AccountsResult {
  const runtime = useRuntime();
  const state = useStore(runtime.accounts.state);
  return {
    accounts: state.accounts,
    selectedAccount: state.selectedAccount,
    status: state.status,
    error: state.error,
    isConnected: state.status === "connected",
    isConnecting: state.status === "connecting",
    connect: useCallback((provider) => runtime.accounts.connect(provider), [runtime]),
    disconnect: useCallback(() => runtime.accounts.disconnect(), [runtime]),
    select: useCallback((address) => runtime.accounts.select(address), [runtime]),
  };
}

/** The currently selected account, or null. */
export function useSelectedAccount(): SignerAccount | null {
  return useStore(useRuntime().accounts.state).selectedAccount;
}

/** Connect as a mutation: `mutate()` / `mutateAsync(provider?)`. */
export function useConnect(options?: {
  mutation?: MutationOptions<SignerAccount[], OptionalVariables<ProviderType>>;
}): UseMutationResult<SignerAccount[], Error, OptionalVariables<ProviderType>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (provider: OptionalVariables<ProviderType>) => runtime.accounts.connect(provider ?? undefined),
    options?.mutation,
  );
}

export function useDisconnect(): () => void {
  const runtime = useRuntime();
  return useCallback(() => runtime.accounts.disconnect(), [runtime]);
}

/** PolkadotSigner of the selected account (null until connected). */
export function useSigner(): PolkadotSigner | null {
  const runtime = useRuntime();
  useStore(runtime.accounts.state); // re-render on signer changes
  return runtime.accounts.getSigner();
}

/** RFC-0009 login — call `mutate` from a user gesture. */
export function useLogin(options?: {
  mutation?: MutationOptions<LoginResult, OptionalVariables<string>>;
}): UseMutationResult<LoginResult, Error, OptionalVariables<string>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (reason: OptionalVariables<string>) => runtime.accounts.login(reason ?? undefined),
    options?.mutation,
  );
}

/** The user's primary DotNS username; null standalone or when not logged in. */
export function useUserId(options?: {
  query?: QueryOptions<string | null>;
}): UseQueryResult<string | null, Error> {
  const runtime = useRuntime();
  return useTruapiQuery(queryKeys.userId(), () => runtime.accounts.getUserId(), options);
}

/** Sign arbitrary bytes with the selected account. */
export function useSignRaw(options?: {
  mutation?: MutationOptions<Uint8Array, Uint8Array>;
}): UseMutationResult<Uint8Array, Error, Uint8Array> {
  const runtime = useRuntime();
  return useTruapiMutation((data: Uint8Array) => runtime.accounts.signRaw(data), options?.mutation);
}
