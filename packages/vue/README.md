# @use-truapi/vue

**Vue 3 composables for building Polkadot apps.**

One install, one plugin, 51 composables. Wraps the entire
[TruAPI](https://github.com/paritytech/truapi) /
[@parity/product-sdk](https://github.com/paritytech/product-sdk) surface —
chain queries, wallet accounts, transactions, contracts, chat, statement
store, payments, notifications and cloud storage — built on
[TanStack Query](https://tanstack.com/query).

> **Status:** this is an experiment, not an official library. The effort will
> move into [@parity/product-sdk](https://github.com/paritytech/product-sdk)
> long term.

## Install

```sh
npm install @use-truapi/vue @tanstack/vue-query
```

## Use

```ts
import { TruapiPlugin, defineConfig } from "@use-truapi/vue";

const config = defineConfig({
  chains: { /* … */ },
  dappName: "my-app",
});

createApp(App).use(TruapiPlugin, { config }).mount("#app");
```

```ts
const { submit, phase } = useTx();
const balance = useBalance(address);
const theme = useTheme();
```

## Docs

Full composable catalog, guides and examples:
**[justraman.github.io/use-truapi](https://justraman.github.io/use-truapi/)** ·
[GitHub](https://github.com/justraman/use-truapi)

## License

MIT
