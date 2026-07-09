import type {
  ChatMessageContent,
  ChatReceivedAction,
  ChatRoom,
  ChatRoomDefinition,
} from "@use-truapi/core";
import { useEffect, useRef } from "react";
import { useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  useAsyncAction,
  useAsyncData,
  useWatchList,
} from "../internal";

/** Register a chat room (idempotent). Chat is host-only. */
export function useChatRoom(room: ChatRoomDefinition): AsyncData<"New" | "Exists"> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chat.registerRoom(room), [runtime, room.roomId]);
}

/** Register a bot identity for posting into rooms. */
export function useChatBot(bot: {
  botId: string;
  name: string;
  icon: string;
}): AsyncData<"New" | "Exists"> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chat.registerBot(bot), [runtime, bot.botId]);
}

/** Rooms the product participates in, live. */
export function useChatRooms(): { rooms: ChatRoom[]; error: Error | undefined } {
  const runtime = useRuntime();
  const { items, error } = useWatchList<ChatRoom[]>(
    (onValue, onError) => runtime.chat.watchRooms(onValue, onError),
    [runtime],
    { limit: 1 },
  );
  return { rooms: items[0] ?? [], error };
}

export interface ChatMessage {
  roomId: string;
  peer: string;
  content: ChatMessageContent;
  receivedAt: number;
}

/** Accumulated `MessagePosted` events for a room (bounded, newest last). */
export function useChatMessages(
  roomId: string | undefined,
  options?: { limit?: number },
): { messages: ChatMessage[]; error: Error | undefined; clear: () => void } {
  const runtime = useRuntime();
  const { items, error, clear } = useWatchList<ChatMessage>(
    (onValue, onError) =>
      runtime.chat.watchActions((action) => {
        if (action.payload.tag !== "MessagePosted") return;
        if (roomId !== undefined && action.roomId !== roomId) return;
        onValue({
          roomId: action.roomId,
          peer: action.peer,
          content: action.payload.value,
          receivedAt: Date.now(),
        });
      }, onError),
    [runtime, roomId],
    { limit: options?.limit ?? 200, enabled: roomId !== undefined },
  );
  return { messages: items, error, clear };
}

/** Raw action stream (messages, button triggers, commands) via a stable handler. */
export function useChatActions(
  onAction: (action: ChatReceivedAction) => void,
  options?: { enabled?: boolean; onError?: (error: unknown) => void },
): void {
  const runtime = useRuntime();
  const handlerRef = useRef(onAction);
  handlerRef.current = onAction;
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    return runtime.chat.watchActions(
      (action) => handlerRef.current(action),
      (e) => onErrorRef.current?.(e),
    );
  }, [runtime, enabled]);
}

/** Send into a room; a plain string becomes a Text message. */
export function useSendChatMessage(
  roomId?: string,
): AsyncAction<
  [content: ChatMessageContent | string, roomIdOverride?: string],
  { messageId: string }
> {
  const runtime = useRuntime();
  return useAsyncAction((content: ChatMessageContent | string, roomIdOverride?: string) => {
    const target = roomIdOverride ?? roomId;
    if (!target) throw new Error("use-truapi: no roomId given to useSendChatMessage");
    return runtime.chat.send(target, content);
  });
}
