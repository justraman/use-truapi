<script setup lang="ts">
import {
  useDeriveEntropy,
  useDevicePermission,
  useHostNavigate,
  useHostStorage,
  useNotifications,
  usePermission,
  useResourceAllocation,
} from "@use-truapi/vue";
import { computed, ref } from "vue";
import { hexPreview } from "../ui";

const note = useHostStorage<string>("example-note");
const navigate = useHostNavigate();
const notifications = useNotifications();
const permission = usePermission();
const devicePermission = useDevicePermission();
const allocation = useResourceAllocation();
const entropy = useDeriveEntropy();
const draft = ref("");

const firstError = computed(
  () =>
    notifications.error.value ??
    permission.error.value ??
    devicePermission.error.value ??
    allocation.error.value ??
    entropy.error.value,
);

function onCancelNotification() {
  const id = notifications.data.value;
  if (id !== undefined) void notifications.cancel(id).catch(() => {});
}

function onDeriveEntropy() {
  void entropy.derive(new TextEncoder().encode("use-truapi-example")).catch(() => {});
}
</script>

<template>
  <section class="panel">
    <h2>Host capabilities</h2>
    <p>Saved note: <span data-testid="note-value">{{ note.data.value ?? "(empty)" }}</span></p>
    <div class="row">
      <input data-testid="note-input" v-model="draft" placeholder="Type a note" />
      <button type="button" data-testid="note-save" @click="void note.set(draft)">Save</button>
      <button type="button" data-testid="note-remove" @click="void note.remove()">Clear</button>
    </div>
    <div class="row">
      <button
        type="button"
        data-testid="host-navigate"
        @click="void navigate('https://polkadot.com').catch(() => {})"
      >
        Open polkadot.com
      </button>
      <button
        type="button"
        data-testid="notify"
        :disabled="notifications.isPending.value"
        @click="notifications.push({ text: 'Hello from use-truapi!' }).catch(() => {})"
      >
        Push notification
      </button>
      <button
        type="button"
        data-testid="cancel-notification"
        :disabled="notifications.data.value === undefined"
        @click="onCancelNotification"
      >
        Cancel it
      </button>
    </div>
    <div class="row">
      <button
        type="button"
        data-testid="request-permission"
        :disabled="permission.isPending.value"
        @click="permission.request({ tag: 'StatementSubmit' }).catch(() => {})"
      >
        Statement permission
      </button>
      <span v-if="permission.data.value !== undefined" class="badge" data-testid="permission-result">
        {{ permission.data.value ? "granted" : "denied" }}
      </span>
      <button
        type="button"
        data-testid="request-device-permission"
        :disabled="devicePermission.isPending.value"
        @click="devicePermission.request('Notifications').catch(() => {})"
      >
        Device notifications
      </button>
      <span
        v-if="devicePermission.data.value !== undefined"
        class="badge"
        data-testid="device-permission-result"
      >
        {{ devicePermission.data.value ? "granted" : "denied" }}
      </span>
    </div>
    <div class="row">
      <button
        type="button"
        data-testid="request-allocation"
        :disabled="allocation.isPending.value"
        @click="allocation.request([{ tag: 'StatementStoreAllowance' }]).catch(() => {})"
      >
        Statement allowance (RFC-0010)
      </button>
      <span v-if="allocation.data.value" class="badge" data-testid="allocation-result">
        {{ allocation.data.value.join(", ") }}
      </span>
      <button
        type="button"
        data-testid="derive-entropy"
        :disabled="entropy.isPending.value"
        @click="onDeriveEntropy"
      >
        Derive entropy (RFC-0007)
      </button>
      <code v-if="entropy.data.value" data-testid="entropy-result">{{ hexPreview(entropy.data.value) }}</code>
    </div>
    <p class="muted">
      Permissions, notifications, allocations and entropy are host capabilities — standalone they
      reject with HostUnavailableError.
    </p>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
