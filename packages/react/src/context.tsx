import {
  type AnyChains,
  type TruapiConfig,
  type TruapiRuntime,
  createRuntime,
} from "@use-truapi/core";
import { type ReactNode, createContext, createElement, useContext, useRef } from "react";

/**
 * Register the app's config type once for typed chain keys in every hook:
 *
 * ```ts
 * const config = defineConfig({ chains: { assetHub: { ... } } });
 * declare module "@use-truapi/react" {
 *   interface Register { config: typeof config }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation point
export interface Register {}

export type ResolvedChains = Register extends { config: TruapiConfig<infer TChains> }
  ? TChains
  : AnyChains;

export type ChainKey = keyof ResolvedChains & string;

const RuntimeContext = createContext<TruapiRuntime | null>(null);

export interface TruapiProviderProps {
  // biome-ignore lint/suspicious/noExplicitAny: TruapiConfig/TruapiRuntime are invariant in their chain map; `any` accepts every concrete config
  config?: TruapiConfig<any>;
  /** Pass a pre-built runtime instead of `config` to control its lifecycle yourself. */
  // biome-ignore lint/suspicious/noExplicitAny: see above
  runtime?: TruapiRuntime<any>;
  children?: ReactNode;
}

export function TruapiProvider({ config, runtime, children }: TruapiProviderProps) {
  const owned = useRef<TruapiRuntime | null>(null);
  if (!runtime && !owned.current) {
    if (!config) throw new Error("use-truapi: TruapiProvider needs a `config` or a `runtime`");
    owned.current = createRuntime(config);
  }
  // The provider-owned runtime lives for the page lifetime: destroying the
  // SignerManager is terminal, and StrictMode's throwaway unmount would kill
  // it mid-app. Pass `runtime` to own teardown explicitly.
  const value = runtime ?? owned.current;

  return createElement(RuntimeContext.Provider, { value }, children);
}

export function useRuntime(): TruapiRuntime<ResolvedChains> {
  const runtime = useContext(RuntimeContext);
  if (!runtime) {
    throw new Error("use-truapi: wrap your app in <TruapiProvider config={...}> to use hooks");
  }
  return runtime as TruapiRuntime<ResolvedChains>;
}
