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
  <section class="panel">
    <h2>
      Contract <span class="muted">{{ COUNTER_LIBRARY }}</span>
    </h2>
    <p class="muted">
      {{ counterAddress ? truncateAddress(counterAddress) : "no address in cdm.json" }} on Asset Hub
    </p>
    <div class="row">
      <span class="badge">
        count: <span data-testid="counter-value">{{ count.data.value?.toString() ?? "—" }}</span>
      </span>
      <button
        type="button"
        data-testid="counter-increment"
        :disabled="!contract.data.value || increment.isPending.value"
        @click="increment.mutate()"
      >
        {{ increment.isPending.value ? "Incrementing…" : "Increment" }}
      </button>
      <button
        type="button"
        data-testid="counter-add"
        :disabled="!contract.data.value || addFive.isPending.value"
        @click="addFive.mutate([5n])"
      >
        Add 5
      </button>
      <button
        type="button"
        data-testid="map-account"
        :disabled="mapAccount.isPending.value"
        @click="mapAccount.mutate()"
      >
        Map account
      </button>
    </div>
    <p class="muted">
      Ad-hoc handle (useContractAt) reads the same value:
      <span data-testid="counter-value-adhoc">{{ adhocCount.data.value?.toString() ?? "—" }}</span>
    </p>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
