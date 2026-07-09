import { HostUnavailableError, getAccountsProvider } from "@parity/product-sdk-host";
import {
  DevProvider,
  HostProvider,
  type ProviderType,
  type SignerAccount,
  type SignerError,
  SignerManager,
  type SignerState,
} from "@parity/product-sdk-signer";
import type { PolkadotSigner } from "polkadot-api";
import type { AnyChains, TruapiConfig } from "./config";
import type { HostController } from "./host";
import { type ReadonlyStore, createStore } from "./store";

export type { ProviderType, SignerAccount, SignerError, SignerState };

export type LoginResult = "Success" | "AlreadyConnected" | "Rejected";

export interface AccountsController {
  state: ReadonlyStore<SignerState>;
  /**
   * Connect once and share the attempt: concurrent callers await the same
   * promise, failures evict it so the next call retries. Defaults to the
   * host provider inside a container and dev accounts standalone.
   */
  connect(provider?: ProviderType): Promise<SignerAccount[]>;
  disconnect(): void;
  select(address: string): SignerAccount;
  getSigner(): PolkadotSigner | null;
  signRaw(data: Uint8Array): Promise<Uint8Array>;
  /** RFC-0009 — call from a user gesture only. No-op success standalone. */
  login(reason?: string): Promise<LoginResult>;
  /** Primary DotNS username; null standalone or when not connected. */
  getUserId(): Promise<string | null>;
  /**
   * The host gates signing on `ChainSubmit`; when missing, a sign request
   * hangs silently instead of erroring. Call in the click context before
   * each transaction. No-op standalone.
   */
  ensureChainSubmitPermission(): Promise<void>;
  manager: SignerManager;
  destroy(): void;
}

export function createAccountsController<TChains extends AnyChains>(
  config: TruapiConfig<TChains>,
  host: HostController,
): AccountsController {
  // HostProvider falls back to `getProductAccount(dappName, 0)` when no
  // productAccount is configured — without dappName, host connect() resolves
  // with zero accounts.
  const dappName = config.dappName ?? "use-truapi";
  const manager = new SignerManager({
    dappName,
    createProvider: (type) =>
      type === "dev"
        ? new DevProvider({})
        : new HostProvider({
            dappName,
            ...(config.productAccount
              ? {
                  productAccount: {
                    dotNsIdentifier: config.productAccount.dotNsIdentifier,
                    derivationIndex: config.productAccount.derivationIndex ?? 0,
                    requestName: config.productAccount.requestName ?? false,
                  },
                }
              : {}),
          }),
  });

  const state = createStore<SignerState>(manager.getState());
  // SignerManager emits synchronously on mutation but never primes — the
  // store seed above is the priming read.
  const stopManagerSub = manager.subscribe((next) => state.set(next));

  let connectPromise: Promise<SignerAccount[]> | null = null;
  const connect = (provider?: ProviderType): Promise<SignerAccount[]> => {
    if (!connectPromise) {
      connectPromise = (async () => {
        const resolved = provider ?? ((await host.detect()) ? "host" : "dev");
        const result = await manager.connect(resolved);
        if (!result.ok) throw result.error;
        return [...result.value];
      })();
      connectPromise.catch(() => {
        connectPromise = null;
      });
    }
    return connectPromise;
  };

  if (config.autoConnect) void connect().catch(() => {});

  return {
    state,
    connect,
    disconnect: () => {
      connectPromise = null;
      manager.disconnect();
    },
    select: (address) => {
      const result = manager.selectAccount(address);
      if (!result.ok) throw result.error;
      return result.value;
    },
    getSigner: () => manager.getSigner(),
    signRaw: async (data) => {
      const result = await manager.signRaw(data);
      if (!result.ok) throw result.error;
      return result.value;
    },
    login: async (reason) => {
      if (!(await host.detect())) return "AlreadyConnected";
      const provider = await getAccountsProvider();
      if (!provider) throw new HostUnavailableError("accounts");
      return provider.requestLogin(reason).match(
        (value) => value,
        (error) => {
          throw new Error(`use-truapi: login failed: ${JSON.stringify(error)}`, { cause: error });
        },
      );
    },
    getUserId: async () => {
      if (!(await host.detect())) return null;
      const provider = await getAccountsProvider();
      if (!provider) return null;
      return provider.getUserId().match(
        (value) => value.primaryUsername,
        () => null,
      );
    },
    ensureChainSubmitPermission: async () => {
      if (!(await host.detect())) return;
      const granted = await host.requestPermission({ tag: "ChainSubmit", value: undefined });
      if (!granted)
        throw new Error("use-truapi: the host denied permission to submit transactions");
    },
    manager,
    destroy: () => {
      stopManagerSub();
      manager.destroy();
    },
  };
}
