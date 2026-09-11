# Rebuilding Tambola on Triangle, and the library that fell out of it

Tambola is Indian bingo. Numbers get called one at a time out of ninety, players cross them off their tickets, and the pot pays out for completing a line or a full house. I used to host it in college, and I rebuilt it as a Triangle app: a Solidity contract on Asset Hub holds the pot, validates tickets, draws the numbers and pays out the winners. The frontend is a React SPA with chat on the statement store, and the draws are triggered through polkadot-flow.

Code: [justraman/tambola-game](https://github.com/justraman/tambola-game)

I built this same game years ago with a PHP backend, Pusher for pub/sub and Netlify for hosting. Three services, three dashboards, and me holding it all together. When the PHP server crashed mid-game, the game went down with it.

## What worked

On Triangle the chain replaces the backend, the pub/sub layer, the hosting and the payment rails. Two playground commands and the whole stack is live.

There's also something I couldn't buy in web2. `drawNumber` is permissionless and open, and the number comes out of consensus randomness mixed with game state rather than out of a server I run. Players don't have to trust whoever happened to call it.

## What hurt

Putting a single balance on screen meant getting the host provider. Creating a PAPI client and caching the promise so twelve components don't each open their own. Evicting that cache when the connection dies, or the app never recovers. Subscribing. Unsubscribing on unmount. Then finding out that hosts pause subscriptions on their own, so handling interrupts separately, because they aren't errors. All of that for one number.

By the time chat worked, the app depended on many product-sdk-* libraries and none of them agreed on how to report success. The signer returns neverthrow, host getters return Result unions, contract queries resolve to `{ success, value }`. Three conventions in one component tree, none of them easy to cache.

Signing had a trap of its own. The host gates it on a `ChainSubmit` permission, and when that permission is missing the request doesn't fail, it hangs. Nothing in the console, no rejection to catch. You have to already know to ask for it, in the click context, before you ever submit.

And the draws forced a compromise. Somebody has to call `drawNumber`. Exposing it in the SPA means several players trigger the same draw; restricting it to the game host means the game stalls the moment they close the tab. I started with a Cloudflare worker, reluctantly, and have since moved the draws onto Leonardo's [polkadot-flow](https://github.com/paritytech/polkadot-flow), which is decentralized serverless compute with staked executors doing the triggering.

## What I did about it

Nearly all of that is plumbing, and plumbing belongs in a library, not rewritten in every app that talks to a host. Karim would keep it exactly as it is, in vanilla JS, and be perfectly happy.. But the rest of us like frontend frameworks and hooks, so I wrote one: `use-truapi`. React hooks and Vue composables for Polkadot apps.

```tsx
const { submit, phase } = useTx();
const balance = useBalance(account?.address);
```

The balance saga from earlier is now the second line. Reads are queries and actions are mutations, so caching, retries and invalidation work the way the rest of a React app already works, and the three result conventions collapse into ordinary query state. Subscriptions are shared and reference counted, so ten components watching the same balance share one host subscription, and interrupts are absorbed by the library rather than by your component.

`useTx` asks for the `ChainSubmit` permission before it ever touches the signer, so the silent hang can't happen to you. Contract calls get the pallet-revive account mapping as one explicit call instead of a first-transaction mystery.

There are 56 hooks now, across chain access, accounts, login, transactions, contracts, chat, statements, payments, storage and theming. The product-sdk packages are dependencies of the wrapper rather than of your app, so the next breaking minor version lands on the package instead of on you.

Docs are at [justraman.github.io/use-truapi](https://justraman.github.io/use-truapi/), and the source is in [justraman/use-truapi](https://github.com/justraman/use-truapi).

Feedback welcome, especially on hook naming and on anything you went looking for and didn't find.
