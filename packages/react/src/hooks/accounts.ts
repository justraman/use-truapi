import type {
  LoginResult,
  ProviderType,
  SignerAccount,
  SignerError,
  SignerState,
} from "@use-truapi/core";
import type { PolkadotSigner } from "polkadot-api";
import { useCallback } from "react";
import { useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  useAsyncAction,
  useAsyncData,
  useStore,
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

/** Connect as a mutation with pending/error state. */
export function useConnect(): AsyncAction<[provider?: ProviderType], SignerAccount[]> {
  const runtime = useRuntime();
  return useAsyncAction((provider?: ProviderType) => runtime.accounts.connect(provider));
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

/** RFC-0009 login — call `run` from a user gesture. */
export function useLogin(): AsyncAction<[reason?: string], LoginResult> {
  const runtime = useRuntime();
  return useAsyncAction((reason?: string) => runtime.accounts.login(reason));
}

/** The user's primary DotNS username; null standalone or when not logged in. */
export function useUserId(): AsyncData<string | null> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.accounts.getUserId(), [runtime]);
}

/** Sign arbitrary bytes with the selected account. */
export function useSignRaw(): AsyncAction<[data: Uint8Array], Uint8Array> {
  const runtime = useRuntime();
  return useAsyncAction((data: Uint8Array) => runtime.accounts.signRaw(data));
}
