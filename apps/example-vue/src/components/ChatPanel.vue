<script setup lang="ts">
import { useIsHost } from "@use-truapi/vue";
import ChatPanelInner from "./ChatPanelInner.vue";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

const isHost = useIsHost();
</script>

<template>
  <UiCard v-if="!isHost" title="Chat" desc="Rooms, bots and messages through the host chat.">
    <HookRow :hook="['useChatRoom', 'useChatMessages', 'useSendChatMessage']">
      <span class="muted" data-testid="chat-unavailable">host only</span>
    </HookRow>
  </UiCard>
  <ChatPanelInner v-else />
</template>
