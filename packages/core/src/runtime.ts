import { type AccountsController, createAccountsController } from "./accounts";
import { type ChainController, createChainController } from "./chain";
import { type ChatController, createChatController } from "./chat";
import { type CloudStorageController, createCloudStorageController } from "./cloud-storage";
import type { AnyChains, TruapiConfig } from "./config";
import { type ContractsController, createContractsController } from "./contracts";
import { type HostController, createHostController } from "./host";
import { type PaymentsController, createPaymentsController } from "./payments";
import { type StatementsController, createStatementsController } from "./statements";
import type { ReadonlyStore } from "./store";
import { type ThemeState, createThemeStore } from "./theme";
import { type TxController, createTxController } from "./tx";

export interface TruapiRuntime<TChains extends AnyChains = AnyChains> {
  config: TruapiConfig<TChains>;
  host: HostController;
  theme: ReadonlyStore<ThemeState>;
  chains: ChainController<TChains>;
  accounts: AccountsController;
  tx: TxController<TChains>;
  contracts: ContractsController<TChains>;
  chat: ChatController;
  statements: StatementsController;
  payments: PaymentsController;
  cloudStorage: CloudStorageController;
  /** Terminal: tears down clients, subscriptions and the signer manager. */
  destroy(): void;
}

export function createRuntime<TChains extends AnyChains>(
  config: TruapiConfig<TChains>,
): TruapiRuntime<TChains> {
  const host = createHostController();
  const chains = createChainController(config, host);
  const accounts = createAccountsController(config, host);

  return {
    config,
    host,
    theme: createThemeStore(host),
    chains,
    accounts,
    tx: createTxController(chains, accounts),
    contracts: createContractsController(config, chains, accounts),
    chat: createChatController(host),
    statements: createStatementsController(config, host),
    payments: createPaymentsController(host),
    cloudStorage: createCloudStorageController(config, accounts),
    destroy: () => {
      chains.destroy();
      accounts.destroy();
    },
  };
}
