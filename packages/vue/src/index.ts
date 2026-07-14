export {
  RUNTIME_KEY,
  TruapiPlugin,
  createTruapiQueryClient,
  useRuntime,
  type ChainKey,
  type Register,
  type ResolvedChains,
  type TruapiPluginOptions,
} from "./context";
export type {
  LiveListQueryResult,
  MaybeGetter,
  MutationOptions,
  MutationResult,
  QueryOptions,
  QueryResult,
} from "./internal";

export * from "./composables/host";
export * from "./composables/chain";
export * from "./composables/accounts";
export * from "./composables/tx";
export * from "./composables/contracts";
export * from "./composables/chat";
export * from "./composables/statements";
export * from "./composables/payments";
export * from "./composables/storage";
export * from "./composables/format";

// Everything an app needs from core, re-exported so `@use-truapi/vue` is
// the only import site.
export {
  defineConfig,
  createRuntime,
  queryKeys,
  toKeyPart,
  formatBalance,
  formatPlanck,
  parseToPlanck,
  truncateAddress,
  ss58Encode,
  ss58ToH160,
  h160ToSs58,
  toGenericSs58,
  addressesEqual,
  HostError,
  HostUnavailableError,
  ChainNotSupportedError,
  TxError,
  TxDispatchError,
  TxSigningRejectedError,
  ContractError,
  ContractRevertedError,
} from "@use-truapi/core";
export type {
  AnyChains,
  ChainConfig,
  SignerAccount,
  SignerState,
  TruapiConfig,
  TruapiRuntime,
  TxResult,
  TxStatus,
} from "@use-truapi/core";
