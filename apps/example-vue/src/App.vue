<script setup lang="ts">
import { useTheme } from "@use-truapi/vue";
import { computed } from "vue";
import AccountsPanel from "./components/AccountsPanel.vue";
import ChainPanel from "./components/ChainPanel.vue";
import ChatPanel from "./components/ChatPanel.vue";
import ContractPanel from "./components/ContractPanel.vue";
import HeaderBar from "./components/HeaderBar.vue";
import HostPanel from "./components/HostPanel.vue";
import PaymentsPanel from "./components/PaymentsPanel.vue";
import StatementsPanel from "./components/StatementsPanel.vue";
import StoragePanel from "./components/StoragePanel.vue";
import TxPanel from "./components/TxPanel.vue";

const theme = useTheme();
const dark = computed(() => theme.value.variant === "dark");
</script>

<template>
  <div
    data-testid="app-root"
    :data-theme="theme.variant"
    :style="{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '640px',
      margin: '0 auto',
      padding: '24px',
      minHeight: '100vh',
      background: dark ? '#16161a' : '#ffffff',
      color: dark ? '#eee' : '#111',
    }"
  >
    <HeaderBar />
    <AccountsPanel />
    <ChainPanel />
    <TxPanel />
    <ContractPanel />
    <StatementsPanel />
    <ChatPanel />
    <PaymentsPanel />
    <StoragePanel />
    <HostPanel />
  </div>
</template>
