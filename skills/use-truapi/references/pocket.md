# Pocket & renderer hooks

The host's Pocket tab shows cards a product declares in its worker manifest; the host owns the collection and asks the product to draw a card's face whenever it is on screen. All hooks here are host-only: queries error and registrations report `HostUnavailableError` through `onError` standalone — gate on `useIsHost()`.

## usePocketCards
`usePocketCards(options?: { enabled?; query? }) → query result; data: PocketCard[]` — `PocketCard = { cardId: string; privileged: boolean }`
- Live: the whole set on subscribe and after every change (`Pocket.list_subscribe`). A product cannot add cards (manifest-declared); `privileged` cards were placed by the host and cannot be removed.

## useRemovePocketCard
`useRemovePocketCard(options?: { mutation? }) → { remove(cardId): Promise<void>, ...mutation state }`
- Resolves when gone; removing an absent card succeeds; a privileged card rejects (`Privileged`). The draw handler stays registered for if the host restores the card.

## usePocketCard
`usePocketCard(cardId: string | undefined, draw: (send, render) => cleanup | void | Promise<…>, options?: { enabled?; onError? }): void`
- Registers the face for one card. `send(face: RendererNode)` may be called repeatedly while the card is displayed (a card is a live face, not a picture); `render = { cardId, payload: "0x…" }`; return a cleanup for when the card leaves. The latest `draw` is always used; disabled while `cardId` is `undefined`.
- `RendererNode` is the host's renderer tree (`{ tag: "String", value: { text } }`, rows, columns, buttons with `clickAction`, …) — see `@parity/truapi` types.

## usePocketCardActions
`usePocketCardActions(cardId, onAction: (action: PocketCardAction) => void, options?: { enabled?; onError? }): void`
- The only way back from a face: `clickAction` / `valueChangeAction` named in the tree arrive as `{ context, actionId, payload }`. Stable handler (read through a ref).

## useRenderer
`useRenderer(tag: "ChatMessage" | "Input" | "PocketCard", handler: (request, send, interrupt) => cleanup, options?: { enabled?; onError? }): void`
- Escape hatch for the other render contexts on the client's single render slot. Claiming one context leaves the others alone; re-claiming replaces the handler. Use `usePocketCard` for cards (it claims `PocketCard`).

```tsx
usePocketCard("balance", (send) => {
  send({ tag: "String", value: { text: `Balance: ${balance}` } });
  return () => {}; // cleanup when the card leaves
});
usePocketCardActions("balance", (a) => a.actionId === "refresh" && refetch());
```
