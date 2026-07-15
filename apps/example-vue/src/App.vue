<script setup lang="ts">
import { useTheme } from "@use-truapi/vue";
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
</script>

<template>
  <div class="app" data-testid="app-root" :data-theme="theme.variant">
    <div class="shell">
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
  </div>
</template>
