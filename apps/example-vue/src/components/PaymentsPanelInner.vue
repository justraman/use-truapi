<script setup lang="ts">
import {
  ss58ToH160,
  useFormattedBalance,
  usePaymentBalance,
  usePaymentStatus,
  useRequestPayment,
  useSelectedAccount,
  useTopUp,
} from "@use-truapi/vue";
import { computed, ref } from "vue";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

const selected = useSelectedAccount();
const balance = usePaymentBalance();
const available = useFormattedBalance(() => balance.data.value?.available, {
  decimals: 10,
  symbol: "PAS",
});
const topUp = useTopUp();
const request = useRequestPayment();
const lastPaymentId = ref<string | undefined>(undefined);
const status = usePaymentStatus(() => lastPaymentId.value);

const firstError = computed(
  () => balance.error.value ?? topUp.error.value ?? request.error.value ?? status.error.value,
);

function onTopUp() {
  void topUp
    .topUp(1_000_000_000n /* 0.1 PAS */, {
      tag: "ProductAccount",
      value: { derivationIndex: 0 },
    })
    .catch(() => {});
}

function onRequest() {
  if (!selected.value) return;
  void request
    .request(500_000_000n /* 0.05 PAS */, ss58ToH160(selected.value.address))
    .then(({ id }) => {
      lastPaymentId.value = id;
    })
    .catch(() => {});
}
</script>

<template>
  <UiCard title="Payments" desc="RFC-0006 payments through the host purse.">
    <HookRow hook="usePaymentBalance">
      <span class="badge" data-testid="payment-balance">purse: {{ available || "—" }}</span>
    </HookRow>
    <HookRow hook="useTopUp">
      <button type="button" data-testid="payment-topup" :disabled="topUp.isPending.value" @click="onTopUp">
        Top up 0.1 PAS
      </button>
    </HookRow>
    <HookRow hook="useRequestPayment">
      <button
        type="button"
        data-testid="payment-request"
        :disabled="!selected || request.isPending.value"
        @click="onRequest"
      >
        Request 0.05 PAS to self
      </button>
    </HookRow>
    <HookRow hook="usePaymentStatus">
      <span v-if="lastPaymentId" class="muted">
        payment <code>{{ lastPaymentId }}</code
        >:
        <span data-testid="payment-status">{{ status.data.value?.tag ?? "…" }}</span>
        <template v-if="status.data.value?.tag === 'Failed'"> ({{ status.data.value.value.reason }})</template>
      </span>
      <span v-else class="muted">request a payment to watch its status</span>
    </HookRow>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </UiCard>
</template>
