<script setup lang="ts">
import { useIsHost } from "@use-truapi/vue";
import HookRow from "./HookRow.vue";
import PaymentsPanelInner from "./PaymentsPanelInner.vue";
import UiCard from "./UiCard.vue";

const isHost = useIsHost();
</script>

<template>
  <UiCard v-if="!isHost" title="Payments" desc="RFC-0006 payments through the host purse.">
    <HookRow :hook="['usePaymentBalance', 'useTopUp', 'useRequestPayment']">
      <span class="muted" data-testid="payments-unavailable">host only</span>
    </HookRow>
  </UiCard>
  <PaymentsPanelInner v-else />
</template>
