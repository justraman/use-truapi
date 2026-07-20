# @use-truapi/react

**React hooks for building Polkadot apps.**

One install, one provider, 51 hooks. Wraps the entire
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
npm install @use-truapi/react @tanstack/react-query
```

## Use

```tsx
import { TruapiProvider, defineConfig } from "@use-truapi/react";

const config = defineConfig({
  chains: { /* … */ },
  dappName: "my-app",
});

createRoot(root).render(
  <TruapiProvider config={config}>
    <App />
  </TruapiProvider>,
);
```

```tsx
const { submit, phase } = useTx();
const balance = useBalance(account?.address);
const theme = useTheme();
```

## Docs

Full hook catalog, guides and examples:
**[justraman.github.io/use-truapi](https://justraman.github.io/use-truapi/)** ·
[GitHub](https://github.com/justraman/use-truapi)

## License

MIT
