import {
  type AnyChains,
  type TruapiConfig,
  type TruapiRuntime,
  createRuntime,
} from "@use-truapi/core";
import { type App, type InjectionKey, type Plugin, inject } from "vue";

/**
 * Register the app's config type once for typed chain keys in every composable:
 *
 * ```ts
 * const config = defineConfig({ chains: { assetHub: { ... } } });
 * declare module "@use-truapi/vue" {
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

export const RUNTIME_KEY: InjectionKey<TruapiRuntime> = Symbol("use-truapi");

export interface TruapiPluginOptions {
  // biome-ignore lint/suspicious/noExplicitAny: TruapiConfig/TruapiRuntime are invariant in their chain map; `any` accepts every concrete config
  config?: TruapiConfig<any>;
  /** Pass a pre-built runtime instead of `config` to control its lifecycle yourself. */
  // biome-ignore lint/suspicious/noExplicitAny: see above
  runtime?: TruapiRuntime<any>;
}

/**
 * ```ts
 * app.use(TruapiPlugin, { config });
 * ```
 */
export const TruapiPlugin: Plugin<[TruapiPluginOptions]> = {
  install(app: App, options: TruapiPluginOptions) {
    const runtime =
      options.runtime ??
      (options.config
        ? createRuntime(options.config)
        : (() => {
            throw new Error("use-truapi: TruapiPlugin needs a `config` or a `runtime`");
          })());
    app.provide(RUNTIME_KEY, runtime);
  },
};

export function useRuntime(): TruapiRuntime<ResolvedChains> {
  const runtime = inject(RUNTIME_KEY, null);
  if (!runtime) {
    throw new Error("use-truapi: install TruapiPlugin (app.use(TruapiPlugin, { config })) first");
  }
  return runtime as TruapiRuntime<ResolvedChains>;
}
