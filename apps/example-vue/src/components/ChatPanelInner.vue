<script setup lang="ts">
import {
  useChatActions,
  useChatBot,
  useChatMessages,
  useChatRoom,
  useChatRooms,
  useSendChatMessage,
} from "@use-truapi/vue";
import { computed, ref } from "vue";

const ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='8' fill='%23e6007a'/%3E%3C/svg%3E";

const ROOM = {
  roomId: "use-truapi-example-room",
  name: "use-truapi example",
  icon: ICON,
};

const room = useChatRoom(ROOM);
const bot = useChatBot({ botId: "use-truapi-example-bot", name: "Example Bot", icon: ICON });
const rooms = useChatRooms();
const messages = useChatMessages(ROOM.roomId);
const send = useSendChatMessage(ROOM.roomId);
const lastAction = ref<string | null>(null);
useChatActions((action) => {
  lastAction.value = action.payload.tag;
});
const draft = ref("");

const firstError = computed(
  () =>
    room.error.value ??
    bot.error.value ??
    rooms.error.value ??
    messages.error.value ??
    send.error.value,
);

function onSend() {
  send.mutate({ content: draft.value });
  draft.value = "";
}
</script>

<template>
  <section class="panel">
    <h2>Chat</h2>
    <div class="row">
      <span class="badge" data-testid="chat-room-status">room: {{ room.data.value ?? "registering…" }}</span>
      <span class="badge" data-testid="chat-bot-status">bot: {{ bot.data.value ?? "registering…" }}</span>
      <span class="badge" data-testid="chat-rooms-count">
        {{ rooms.data.value?.length ?? 0 }} room{{ (rooms.data.value?.length ?? 0) === 1 ? "" : "s" }}
      </span>
      <span v-if="lastAction" class="muted" data-testid="chat-last-action">last action: {{ lastAction }}</span>
    </div>
    <ul data-testid="chat-messages">
      <li
        v-for="(message, i) in messages.data.value ?? []"
        :key="`${message.peer}-${message.receivedAt}-${i}`"
      >
        <code>{{ message.peer.slice(0, 8) }}</code
        >:
        {{ message.content.tag === "Text" ? message.content.value.text : `[${message.content.tag}]` }}
      </li>
    </ul>
    <div class="row">
      <input data-testid="chat-input" v-model="draft" placeholder="Say something" />
      <button
        type="button"
        data-testid="chat-send"
        :disabled="send.isPending.value || draft === ''"
        @click="onSend"
      >
        Send
      </button>
    </div>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
