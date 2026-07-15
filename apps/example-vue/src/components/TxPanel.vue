<script setup lang="ts">
import { useBatchTx, useTx } from "@use-truapi/vue";
import { Binary } from "polkadot-api";

const tx = useTx();
const batch = useBatchTx();

function onRemark() {
  void tx
    .submit((api) => api.tx.System.remark({ remark: Binary.fromText("gm from use-truapi") }))
    .catch(() => {});
}

function onBatch() {
  void batch
    .submit((api) => [
      api.tx.System.remark({ remark: Binary.fromText("batch 1/2") }),
      api.tx.System.remark({ remark: Binary.fromText("batch 2/2") }),
    ])
    .catch(() => {});
}
</script>

<template>
  <section class="panel">
    <h2>Transactions</h2>
    <div class="row">
      <button type="button" data-testid="tx-remark" :disabled="tx.isPending.value" @click="onRemark">
        Submit remark
      </button>
      <span class="badge" data-testid="tx-phase">{{ tx.phase.value }}</span>
      <span v-if="tx.data.value" class="muted" data-testid="tx-result">
        {{ tx.data.value.ok ? `in block #${tx.data.value.block.number}` : "dispatch failed" }}
      </span>
    </div>
    <div class="row">
      <button type="button" data-testid="batch-remark" :disabled="batch.isPending.value" @click="onBatch">
        Submit batch (2 remarks)
      </button>
      <span class="badge" data-testid="batch-phase">{{ batch.phase.value }}</span>
      <span v-if="batch.data.value" class="muted" data-testid="batch-result">
        {{ batch.data.value.ok ? `in block #${batch.data.value.block.number}` : "dispatch failed" }}
      </span>
    </div>
    <p v-if="tx.error.value ?? batch.error.value" class="error">
      {{ (tx.error.value ?? batch.error.value)?.message }}
    </p>
  </section>
</template>
