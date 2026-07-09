import type {
  ChatMessageContent,
  ChatReceivedAction,
  ChatRoom,
  ChatRoomDefinition,
} from "@use-truapi/core";
import { type ComputedRef, type Ref, type ShallowRef, computed, watch as vueWatch } from "vue";
import { useRuntime } from "../context";
import {
  type AsyncAction,
  type AsyncData,
  type MaybeGetter,
  toGetter,
  useAsyncAction,
  useAsyncData,
  useSubscriptionList,
} from "../internal";

/** Register a chat room (idempotent). Chat is host-only. */
export function useChatRoom(room: ChatRoomDefinition): AsyncData<"New" | "Exists"> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chat.registerRoom(room));
}

/** Register a bot identity for posting into rooms. */
export function useChatBot(bot: {
  botId: string;
  name: string;
  icon: string;
}): AsyncData<"New" | "Exists"> {
  const runtime = useRuntime();
  return useAsyncData(() => runtime.chat.registerBot(bot));
}

/** Rooms the product participates in, live. */
export function useChatRooms(): {
  rooms: ComputedRef<ChatRoom[]>;
  error: ShallowRef<Error | undefined>;
} {
  const runtime = useRuntime();
  const { items, error } = useSubscriptionList<ChatRoom[]>(
    (onValue, onError) => runtime.chat.watchRooms(onValue, onError),
    [],
    { limit: 1 },
  );
  return { rooms: computed(() => items.value[0] ?? []), error };
}

export interface ChatMessage {
  roomId: string;
  peer: string;
  content: ChatMessageContent;
  receivedAt: number;
}

/** Accumulated `MessagePosted` events for a room (bounded, newest last). */
export function useChatMessages(
  roomId: MaybeGetter<string | undefined>,
  options?: { limit?: number },
): { messages: Ref<ChatMessage[]>; error: ShallowRef<Error | undefined>; clear: () => void } {
  const runtime = useRuntime();
  const getRoomId = toGetter(roomId);
  const { items, error, clear } = useSubscriptionList<ChatMessage>(
    (onValue, onError) =>
      runtime.chat.watchActions((action) => {
        const target = getRoomId();
        if (action.payload.tag !== "MessagePosted") return;
        if (target !== undefined && action.roomId !== target) return;
        onValue({
          roomId: action.roomId,
          peer: action.peer,
          content: action.payload.value,
          receivedAt: Date.now(),
        });
      }, onError),
    [getRoomId],
    { limit: options?.limit ?? 200, enabled: () => getRoomId() !== undefined },
  );
  return { messages: items, error, clear };
}

/** Raw action stream (messages, button triggers, commands). */
export function useChatActions(
  onAction: (action: ChatReceivedAction) => void,
  options?: { enabled?: MaybeGetter<boolean>; onError?: (error: unknown) => void },
): void {
  const runtime = useRuntime();
  const enabled = toGetter(options?.enabled ?? true);

  vueWatch(
    [enabled],
    (_next, _prev, onCleanup) => {
      if (!enabled()) return;
      onCleanup(runtime.chat.watchActions(onAction, options?.onError));
    },
    { immediate: true },
  );
}

/** Send into a room; a plain string becomes a Text message. */
export function useSendChatMessage(
  roomId?: MaybeGetter<string | undefined>,
): AsyncAction<
  [content: ChatMessageContent | string, roomIdOverride?: string],
  { messageId: string }
> {
  const runtime = useRuntime();
  const getRoomId = toGetter(roomId ?? (() => undefined));
  return useAsyncAction((content: ChatMessageContent | string, roomIdOverride?: string) => {
    const target = roomIdOverride ?? getRoomId();
    if (!target) throw new Error("use-truapi: no roomId given to useSendChatMessage");
    return runtime.chat.send(target, content);
  });
}
