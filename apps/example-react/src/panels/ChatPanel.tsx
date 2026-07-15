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
import { Card, HookRow } from "../ui";

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23e6007a'/%3E%3C/svg%3E";

const ROOM = {
  roomId: "use-truapi-example-room",
  name: "use-truapi example",
  icon: ICON,
};

const DESC = "Rooms, bots and messages through the host chat.";

export function ChatPanel() {
  const isHost = useIsHost();
  if (!isHost) {
    return (
      <Card title="Chat" desc={DESC}>
        <HookRow hook={["useChatRoom", "useChatMessages", "useSendChatMessage"]}>
          <span className="muted" data-testid="chat-unavailable">
            host only
          </span>
        </HookRow>
      </Card>
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
    <Card title="Chat" desc={DESC}>
      <HookRow hook="useChatRoom">
        <span className="badge" data-testid="chat-room-status">
          room: {room.data ?? "registering…"}
        </span>
      </HookRow>
      <HookRow hook="useChatBot">
        <span className="badge" data-testid="chat-bot-status">
          bot: {bot.data ?? "registering…"}
        </span>
      </HookRow>
      <HookRow hook="useChatRooms">
        <span className="badge" data-testid="chat-rooms-count">
          {rooms.data?.length ?? 0} room{(rooms.data?.length ?? 0) === 1 ? "" : "s"}
        </span>
      </HookRow>
      <HookRow hook="useChatMessages">
        {(messages.data?.length ?? 0) === 0 ? (
          <span className="muted">no messages yet</span>
        ) : (
          <ul className="list" data-testid="chat-messages">
            {(messages.data ?? []).map((message, i) => (
              <li key={`${message.peer}-${message.receivedAt}-${i}`}>
                <code>{message.peer.slice(0, 8)}</code>:{" "}
                {message.content.tag === "Text"
                  ? message.content.value.text
                  : `[${message.content.tag}]`}
              </li>
            ))}
          </ul>
        )}
      </HookRow>
      <HookRow hook="useSendChatMessage">
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
      </HookRow>
      <HookRow hook="useChatActions">
        <span className="muted" data-testid="chat-last-action">
          {lastAction ? `last action: ${lastAction}` : "no actions received yet"}
        </span>
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
