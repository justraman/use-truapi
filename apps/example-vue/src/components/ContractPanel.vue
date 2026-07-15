<script setup lang="ts">
import {
  truncateAddress,
  useContract,
  useContractAt,
  useContractQuery,
  useContractTx,
  useEnsureAccountMapped,
} from "@use-truapi/vue";
import { computed } from "vue";
import { COUNTER_LIBRARY, cdmJson, counterAbi, counterAddress } from "../counter-contract";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

// Manifest path: typed handle resolved from cdm.json.
const contract = useContract(cdmJson, COUNTER_LIBRARY);
const count = useContractQuery<bigint>(contract, "getCount", []);
const refetchCount = () => void count.refetch();
const increment = useContractTx(contract, "increment", {
  mutation: { onSuccess: refetchCount },
});
const addFive = useContractTx(contract, "add", {
  mutation: { onSuccess: refetchCount },
});
// One-time pallet-revive mapping, required before the first contract tx.
const mapAccount = useEnsureAccountMapped(cdmJson);
// Ad-hoc path: same contract through a raw address + ABI.
const adhoc = useContractAt(counterAddress, counterAbi);
const adhocCount = useContractQuery<bigint>(adhoc, "getCount", []);

const desc = `Counter contract at ${counterAddress ? truncateAddress(counterAddress) : "(no address in cdm.json)"} on Asset Hub.`;

const firstError = computed(
  () =>
    contract.error.value ??
    count.error.value ??
    increment.error.value ??
    addFive.error.value ??
    mapAccount.error.value,
);
</script>

<template>
  <UiCard :title="`Contracts · ${COUNTER_LIBRARY}`" :desc="desc">
    <HookRow hook="useContract">
      <span class="badge">
        handle: {{ contract.data.value ? "resolved from cdm.json" : "resolving…" }}
      </span>
    </HookRow>
    <HookRow hook="useContractQuery">
      <span class="muted">getCount()</span>
      <span class="value" data-testid="counter-value">{{ count.data.value?.toString() ?? "—" }}</span>
    </HookRow>
    <HookRow hook="useContractTx">
      <button
        type="button"
        data-testid="counter-increment"
        :disabled="!contract.data.value || increment.isPending.value"
        @click="increment.send().catch(() => {})"
      >
        {{ increment.isPending.value ? "Incrementing…" : "Increment" }}
      </button>
      <button
        type="button"
        data-testid="counter-add"
        :disabled="!contract.data.value || addFive.isPending.value"
        @click="addFive.send([5n]).catch(() => {})"
      >
        Add 5
      </button>
    </HookRow>
    <HookRow hook="useEnsureAccountMapped">
      <button
        type="button"
        data-testid="map-account"
        :disabled="mapAccount.isPending.value"
        @click="mapAccount.ensureMapped().catch(() => {})"
      >
        Map account
      </button>
      <span class="muted">one-time pallet-revive mapping before the first tx</span>
    </HookRow>
    <HookRow hook="useContractAt">
      <span class="muted">ad-hoc handle (address + ABI) reads the same value</span>
      <span class="value" data-testid="counter-value-adhoc">{{ adhocCount.data.value?.toString() ?? "—" }}</span>
    </HookRow>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </UiCard>
</template>
