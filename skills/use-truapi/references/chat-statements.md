# Chat & statements

Host chat (rooms, bots, messages, action streams) and ephemeral pub/sub over the Polkadot statement store. All hooks here are host-only; chat hooks error with `HostUnavailableError` standalone, statement hooks degrade silently (inert / `false`).

## useChatRoom

`useChatRoom(room: { roomId, name, icon }, options?: { query? }) → UseQueryResult<"New" | "Exists", Error>`

- Registers a room the product hosts; `icon` is a URL or base64 data URI. `"New"` = just created, `"Exists"` = already registered.
- Idempotent: cached per `roomId` for the runtime's lifetime — mounting from several components makes one host call; re-registering resolves `"Exists"`.
- Standalone: query settles in error state with `HostUnavailableError`. Gate chat UI with `useIsHost`.

## useChatBot

`useChatBot(bot: { botId, name, icon }, options?: { query? }) → UseQueryResult<"New" | "Exists", Error>`

- Registers a bot identity to post under in rooms; same `"New" | "Exists"` semantics and per-`botId` caching as `useChatRoom`.
- Typical bot: register identity, post `Actions` messages via `useSendChatMessage`, react to `ActionTriggered` events via `useChatActions`.
- Standalone: error state with `HostUnavailableError`.

## useChatRooms

`useChatRooms(options?: { query? }) → UseQueryResult<ChatRoom[], Error>`

- Live list of rooms the product participates in; each entry has `roomId` and `participatingAs` (`"RoomHost"` or `"Bot"`).
- Seeded with `[]` so it settles immediately; pushed, not polled — nothing to refetch. One shared watch across all consumers, dropped when the last unmounts.
- Standalone: flips to error state with `HostUnavailableError`; last `data` (the empty seed) is retained.

## useChatMessages

`useChatMessages(roomId: string | undefined, options?: { limit?, query? }) → LiveListQueryResult<ChatMessage>` (= `UseQueryResult<ChatMessage[], Error> & { clear(): void }`)

- Live tail of `MessagePosted` events, NOT a history fetch: starts empty, accumulates newest-last. Bounded at `limit` (default `200`), oldest dropped. `clear()` empties the list.
- `ChatMessage`: `{ roomId, peer, content: ChatMessageContent, receivedAt }`.
- Subscription shared per room; accumulated messages live in the query cache and survive remounts. `roomId === undefined` disables the hook (safe with route params).
- Standalone: error state with `HostUnavailableError`.

## useChatActions

`useChatActions(onAction: (action: ChatReceivedAction) => void, options?: { enabled?, onError? }) → void`

- Pure side-effect hook over the raw action stream. `ChatReceivedAction`: `{ roomId, peer, payload }` where `payload` is tagged: `MessagePosted` (value: `ChatMessageContent`), `ActionTriggered` (value: `{ messageId, actionId, payload? }`), `Command` (value: `{ command, payload }`).
- Handler is read through a ref — inline functions are fine, no re-subscribe on identity change.
- `enabled: false` drops the subscription; flipping back re-attaches, missed events are NOT replayed.
- Standalone: subscription failure lands in `onError` (`HostUnavailableError`); silent without one.

## useSendChatMessage

`useSendChatMessage(roomId?: string, options?: { mutation? }) → NamedMutation<{ messageId: string }, SendChatMessageVariables>` — call `send(content: string | ChatMessageContent, roomId?)`, resolves `{ messageId }`.

- Plain string is sugar for `{ tag: "Text", value: { text } }`; other variants pass through, e.g. `{ tag: "Actions", value: { text, actions: [{ actionId, title }], layout: "Column" } }` or `{ tag: "Reaction", value: { messageId, emoji } }`.
- Room resolution: call-site `roomId` (2nd arg) overrides the hook-level one; if neither is given, `send` rejects. Omit the hook arg for bots replying into `action.roomId`.
- Standalone: `send` rejects with `HostUnavailableError`. Fire-and-forget with `void send(x).catch(() => {})` — failures still land in `error`.

Minimal chat panel:

```tsx
import { useChatMessages, useChatRoom, useSendChatMessage } from "@use-truapi/react";

const room = { roomId: "support", name: "Support", icon: "https://example.com/s.png" };

function SupportChat() {
  const { isPending: opening, error: roomError } = useChatRoom(room);
  const { data: messages, clear } = useChatMessages(room.roomId);
  const { send, isPending: sending } = useSendChatMessage(room.roomId);

  if (opening) return <p>Opening…</p>;
  if (roomError) return <p>Chat unavailable: {roomError.message}</p>;
  return (
    <>
      <ul>
        {messages?.map((m, i) => (
          <li key={`${m.receivedAt}-${i}`}>
            <b>{m.peer}</b>: {m.content.tag === "Text" ? m.content.value.text : `[${m.content.tag}]`}
          </li>
        ))}
      </ul>
      <button disabled={sending} onClick={() => void send("hi").catch(() => {})}>Send</button>
      <button onClick={clear}>Clear</button>
    </>
  );
}
```

Bot pattern: `useChatActions` handler checks `action.payload.tag === "ActionTriggered" && action.payload.value.actionId === "roll"`, then replies with `send(text, action.roomId)`.

## useStatements

`useStatements<T>(options?: { topic2?, limit?, enabled?, query? }) → LiveListQueryResult<ReceivedStatement<T>>`

- Subscribes to ephemeral statements on the app's topic; accumulates newest-last, bounded at `limit` (default `500`), `clear()` empties without unsubscribing. Pushed, not polled.
- `ReceivedStatement<T>`: JSON-decoded `data: T` plus metadata (`signerHex`, `topics`, `expiry`).
- `topic2` narrows to a room/document — only statements published with the same secondary topic arrive. Consumers of the same `topic2` share one subscription.
- Config prerequisite: set `statements: { appName: "my-app" }` in `defineConfig` (topic scope; falls back to `dappName`). Standalone: inert — `data` settles to `[]`, no error.

## usePublishStatement

`usePublishStatement<T>(options?: { mutation? }) → NamedMutation<boolean, PublishStatementVariables<T>>` — call `publish(data: T, options?: { topic2?, ttlSeconds? })`, resolves `boolean`.

- Resolved boolean is data, not an exception: `true` = store accepted, `false` = undeliverable (store rejected, or running standalone).
- Throws only for real failures, e.g. JSON encoding exceeding the 512-byte statement limit.
- Scope with `topic2` (subscribers must filter on the same value); `ttlSeconds` overrides time-to-live.

Publish/subscribe round trip (every mounted instance sees every ping, including its own):

```tsx
import { usePublishStatement, useStatements } from "@use-truapi/react";

interface Ping { from: string; sentAt: number }

function PingBoard({ name }: { name: string }) {
  const { data: pings } = useStatements<Ping>();
  const { publish, isPending } = usePublishStatement<Ping>();

  async function onPing() {
    const delivered = await publish({ from: name, sentAt: Date.now() });
    if (!delivered) console.warn("not delivered (rejected or standalone)");
  }
  return (
    <>
      <button disabled={isPending} onClick={onPing}>Ping</button>
      <ul>{pings?.map((p, i) => <li key={i}>{p.data.from}</li>)}</ul>
    </>
  );
}
```

## useStatementChannel

`useStatementChannel<T extends object>(options?: { topic2? }) → { values: ReadonlyMap<string, T>, write: (channelName: string, value: T) => Promise<boolean>, ready: boolean }`

- Last-write-wins: one value per channel name (newer write replaces). For presence, cursors, typing indicators — not feeds.
- `values` keys are hex-encoded channel hashes, not the names you wrote — put identity (peer id, name) in the payload and render from it. A `timestamp` payload field drives LWW ordering; filled with current time when omitted.
- Channels live under the app topic; different `topic2` values give fully independent channel maps (e.g. `topic2: \`doc-${docId}\``). Channel values are statements, so writes share the 512-byte JSON payload cap.
- Standalone: `ready` stays `false`, `values` stays empty, `write` resolves `false` (also before init completes in a host — treat `!ready` as "not yet", and use `useHostMode()` if you need to tell "standalone" apart from "still connecting").
- React re-creates the store when `topic2` changes. Vue quirk: `values`/`ready` are refs (`.value` in script), `write` is a plain function, and `topic2` is captured once — remount with `:key` to switch documents.

Presence pattern: gate on `ready`, then `write(\`presence/${peerId}\`, { peerId, name, timestamp: Date.now() })` on a ~10s interval; render `[...values.values()]`.
