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
  topUp.mutate({
    amount: 1_000_000_000n, // 0.1 PAS
    source: { tag: "ProductAccount", value: { derivationIndex: 0 } },
  });
}

function onRequest() {
  if (!selected.value) return;
  request.mutate(
    {
      amount: 500_000_000n, // 0.05 PAS
      destination: ss58ToH160(selected.value.address),
    },
    {
      onSuccess: ({ id }) => {
        lastPaymentId.value = id;
      },
    },
  );
}
</script>

<template>
  <section class="panel">
    <h2>Payments (RFC-0006)</h2>
    <div class="row">
      <span class="badge" data-testid="payment-balance">purse: {{ available || "—" }}</span>
      <button type="button" data-testid="payment-topup" :disabled="topUp.isPending.value" @click="onTopUp">
        Top up 0.1 PAS
      </button>
      <button
        type="button"
        data-testid="payment-request"
        :disabled="!selected || request.isPending.value"
        @click="onRequest"
      >
        Request 0.05 PAS to self
      </button>
    </div>
    <p v-if="lastPaymentId" class="muted">
      Payment <code>{{ lastPaymentId }}</code
      >:
      <span data-testid="payment-status">{{ status.data.value?.tag ?? "…" }}</span>
      <template v-if="status.data.value?.tag === 'Failed'"> ({{ status.data.value.value.reason }})</template>
    </p>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
