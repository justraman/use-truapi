import {
  type LoginResult,
  type ProviderType,
  type SignerAccount,
  type SignerError,
  type SignerState,
  queryKeys,
} from "@use-truapi/core";
import type { PolkadotSigner } from "polkadot-api";
import { type ComputedRef, computed } from "vue";
import { useRuntime } from "../context";
import {
  type MutationOptions,
  type MutationResult,
  type OptionalVariables,
  type QueryOptions,
  type QueryResult,
  useStore,
  useTruapiMutation,
  useTruapiQuery,
} from "../internal";

export interface AccountsResult {
  accounts: ComputedRef<readonly SignerAccount[]>;
  selectedAccount: ComputedRef<SignerAccount | null>;
  status: ComputedRef<SignerState["status"]>;
  error: ComputedRef<SignerError | null>;
  isConnected: ComputedRef<boolean>;
  isConnecting: ComputedRef<boolean>;
  connect: (provider?: ProviderType) => Promise<SignerAccount[]>;
  disconnect: () => void;
  select: (address: string) => SignerAccount;
}

/** Wallet state + connect/disconnect/select, backed by the shared SignerManager. */
export function useAccounts(): AccountsResult {
  const runtime = useRuntime();
  const state = useStore(runtime.accounts.state);
  return {
    accounts: computed(() => state.value.accounts),
    selectedAccount: computed(() => state.value.selectedAccount),
    status: computed(() => state.value.status),
    error: computed(() => state.value.error),
    isConnected: computed(() => state.value.status === "connected"),
    isConnecting: computed(() => state.value.status === "connecting"),
    connect: (provider) => runtime.accounts.connect(provider),
    disconnect: () => runtime.accounts.disconnect(),
    select: (address) => runtime.accounts.select(address),
  };
}

/** The currently selected account, or null. */
export function useSelectedAccount(): ComputedRef<SignerAccount | null> {
  const state = useStore(useRuntime().accounts.state);
  return computed(() => state.value.selectedAccount);
}

/** Connect as a mutation: `mutate()` / `mutateAsync(provider?)`. */
export function useConnect(options?: {
  mutation?: MutationOptions<SignerAccount[], OptionalVariables<ProviderType>>;
}): MutationResult<SignerAccount[], OptionalVariables<ProviderType>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (provider: OptionalVariables<ProviderType>) => runtime.accounts.connect(provider ?? undefined),
    options?.mutation,
  );
}

export function useDisconnect(): () => void {
  const runtime = useRuntime();
  return () => runtime.accounts.disconnect();
}

/** PolkadotSigner of the selected account (null until connected). */
export function useSigner(): ComputedRef<PolkadotSigner | null> {
  const runtime = useRuntime();
  const state = useStore(runtime.accounts.state);
  return computed(() => {
    void state.value; // recompute on signer changes
    return runtime.accounts.getSigner();
  });
}

/** RFC-0009 login — call `mutate` from a user gesture. */
export function useLogin(options?: {
  mutation?: MutationOptions<LoginResult, OptionalVariables<string>>;
}): MutationResult<LoginResult, OptionalVariables<string>> {
  const runtime = useRuntime();
  return useTruapiMutation(
    (reason: OptionalVariables<string>) => runtime.accounts.login(reason ?? undefined),
    options?.mutation,
  );
}

/** The user's primary DotNS username; null standalone or when not logged in. */
export function useUserId(options?: {
  query?: QueryOptions<string | null>;
}): QueryResult<string | null> {
  const runtime = useRuntime();
  return useTruapiQuery(
    () => queryKeys.userId(),
    () => runtime.accounts.getUserId(),
    options,
  );
}

/** Sign arbitrary bytes with the selected account. */
export function useSignRaw(options?: {
  mutation?: MutationOptions<Uint8Array, Uint8Array>;
}): MutationResult<Uint8Array, Uint8Array> {
  const runtime = useRuntime();
  return useTruapiMutation((data: Uint8Array) => runtime.accounts.signRaw(data), options?.mutation);
}
