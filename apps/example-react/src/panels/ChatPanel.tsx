import {
  useChatActions,
  useChatBot,
  useChatMessages,
  useChatRoom,
  useChatRooms,
  useIsHost,
  useSendChatMessage,
} from "@use-truapi/react";
import { useState } from "react";
import { badge, errorText, heading, muted, panel, row } from "../ui";

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23e6007a'/%3E%3C/svg%3E";

const ROOM = {
  roomId: "use-truapi-example-room",
  name: "use-truapi example",
  icon: ICON,
};

export function ChatPanel() {
  const isHost = useIsHost();
  if (!isHost) {
    return (
      <section style={panel}>
        <h2 style={heading}>Chat</h2>
        <p data-testid="chat-unavailable">host only</p>
      </section>
    );
  }
  return <HostChat />;
}

function HostChat() {
  const room = useChatRoom(ROOM);
  const bot = useChatBot({ botId: "use-truapi-example-bot", name: "Example Bot", icon: ICON });
  const rooms = useChatRooms();
  const messages = useChatMessages(ROOM.roomId);
  const send = useSendChatMessage(ROOM.roomId);
  const [lastAction, setLastAction] = useState<string | null>(null);
  useChatActions((action) => setLastAction(action.payload.tag));
  const [draft, setDraft] = useState("");

  const error = room.error ?? bot.error ?? rooms.error ?? messages.error ?? send.error;

  return (
    <section style={panel}>
      <h2 style={heading}>Chat</h2>
      <div style={row}>
        <span style={badge} data-testid="chat-room-status">
          room: {room.data ?? "registering…"}
        </span>
        <span style={badge} data-testid="chat-bot-status">
          bot: {bot.data ?? "registering…"}
        </span>
        <span style={badge} data-testid="chat-rooms-count">
          {rooms.data?.length ?? 0} room{(rooms.data?.length ?? 0) === 1 ? "" : "s"}
        </span>
        {lastAction && (
          <span style={muted} data-testid="chat-last-action">
            last action: {lastAction}
          </span>
        )}
      </div>
      <ul data-testid="chat-messages">
        {(messages.data ?? []).map((message, i) => (
          <li key={`${message.peer}-${message.receivedAt}-${i}`}>
            <code>{message.peer.slice(0, 8)}</code>:{" "}
            {message.content.tag === "Text"
              ? message.content.value.text
              : `[${message.content.tag}]`}
          </li>
        ))}
      </ul>
      <div style={row}>
        <input
          data-testid="chat-input"
          value={draft}
          placeholder="Say something"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          data-testid="chat-send"
          disabled={send.isPending || draft === ""}
          onClick={() => {
            void send.send(draft).catch(() => {});
            setDraft("");
          }}
        >
          Send
        </button>
      </div>
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
