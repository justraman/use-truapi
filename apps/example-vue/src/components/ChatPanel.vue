<script setup lang="ts">
import { useIsHost } from "@use-truapi/vue";
import ChatPanelInner from "./ChatPanelInner.vue";

const isHost = useIsHost();
</script>

<template>
  <section v-if="!isHost" class="panel">
    <h2>Chat</h2>
    <p data-testid="chat-unavailable">host only</p>
  </section>
  <ChatPanelInner v-else />
</template>
