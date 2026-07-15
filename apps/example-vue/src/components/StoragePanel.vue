<script setup lang="ts">
import { useCid, useStorageAuthorization, useUpload } from "@use-truapi/vue";
import { computed, ref } from "vue";

const authorization = useStorageAuthorization();
const upload = useUpload();
const lastCid = ref<string | undefined>(undefined);
const fetched = useCid(() => lastCid.value);
const draft = ref("");

const firstError = computed(
  () => authorization.error.value ?? upload.error.value ?? fetched.error.value,
);

const fetchedText = computed(() =>
  fetched.data.value ? new TextDecoder().decode(fetched.data.value) : undefined,
);

function onUpload() {
  void upload
    .upload(new TextEncoder().encode(draft.value))
    .then((result) => {
      lastCid.value = result.cid?.toString();
    })
    .catch(() => {});
}
</script>

<template>
  <section class="panel">
    <h2>Cloud storage (Bulletin)</h2>
    <div class="row">
      <span class="badge" data-testid="storage-authorization">
        {{
          authorization.data.value
            ? authorization.data.value.authorized
              ? `quota: ${authorization.data.value.remainingTransactions} txns / ${authorization.data.value.remainingBytes} bytes`
              : "not authorized"
            : "checking quota…"
        }}
      </span>
    </div>
    <div class="row">
      <input data-testid="upload-input" v-model="draft" placeholder="Bytes to store" />
      <button
        type="button"
        data-testid="upload-submit"
        :disabled="upload.isPending.value || draft === ''"
        @click="onUpload"
      >
        {{ upload.isPending.value ? "Uploading…" : "Upload" }}
      </button>
    </div>
    <p v-if="lastCid" class="muted">
      CID <code data-testid="upload-cid">{{ lastCid }}</code> reads back:
      <span data-testid="cid-content">{{ fetchedText ?? "fetching…" }}</span>
    </p>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
