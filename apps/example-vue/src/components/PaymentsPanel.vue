<script setup lang="ts">
import { useIsHost } from "@use-truapi/vue";
import PaymentsPanelInner from "./PaymentsPanelInner.vue";

const isHost = useIsHost();
</script>

<template>
  <section v-if="!isHost" class="panel">
    <h2>Payments</h2>
    <p data-testid="payments-unavailable">host only</p>
  </section>
  <PaymentsPanelInner v-else />
</template>
