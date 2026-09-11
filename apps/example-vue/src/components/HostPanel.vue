<script setup lang="ts">
import {
  useDeriveEntropy,
  useDevicePermission,
  useHostChainInfo,
  useHostNavigate,
  useHostStorage,
  useNotifications,
  usePermission,
  useResourceAllocation,
} from "@use-truapi/vue";
import { computed, ref } from "vue";
import { hexPreview } from "../ui";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

const note = useHostStorage<string>("example-note");
const navigate = useHostNavigate();
const notifications = useNotifications();
const permission = usePermission();
const devicePermission = useDevicePermission();
const allocation = useResourceAllocation();
const entropy = useDeriveEntropy();
// RFC-0026 discovery: which chains the host serves, by role.
const chains = useHostChainInfo(["Relay", "AssetHub", "People", "Bulletin"]);
const chainsLabel = computed(() => {
  const data = chains.data.value;
  if (!data) {
    return chains.isPending.value
      ? "discovering chains…"
      : "no chain discovery (standalone or legacy host)";
  }
  return Object.entries(data.chains)
    .map(([role, genesis]) => `${role} ${genesis.slice(0, 10)}…`)
    .join(" · ");
});
const draft = ref("");

const firstError = computed(
  () =>
    notifications.error.value ??
    permission.error.value ??
    devicePermission.error.value ??
    allocation.error.value ??
    entropy.error.value ??
    chains.error.value,
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
  <UiCard
    title="Host capabilities"
    desc="Standalone these reject with HostUnavailableError — run inside a host to try them."
  >
    <HookRow hook="useHostStorage">
      <span class="muted">
        saved note: <span data-testid="note-value">{{ note.data.value ?? "(empty)" }}</span>
      </span>
      <input data-testid="note-input" v-model="draft" placeholder="Type a note" />
      <button type="button" data-testid="note-save" @click="void note.set(draft)">Save</button>
      <button type="button" data-testid="note-remove" @click="void note.remove()">Clear</button>
    </HookRow>
    <HookRow hook="useHostNavigate">
      <button
        type="button"
        data-testid="host-navigate"
        @click="void navigate('https://polkadot.com').catch(() => {})"
      >
        Open polkadot.com
      </button>
    </HookRow>
    <HookRow hook="useNotifications">
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
    </HookRow>
    <HookRow hook="usePermission">
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
    </HookRow>
    <HookRow hook="useDevicePermission">
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
    </HookRow>
    <HookRow hook="useResourceAllocation">
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
    </HookRow>
    <HookRow hook="useHostChainInfo">
      <span class="muted" data-testid="host-chains">
        <template v-if="chains.data.value">network <code>{{ chains.data.value.network }}</code>: </template>
        {{ chainsLabel }}
      </span>
    </HookRow>
    <HookRow hook="useDeriveEntropy">
      <button
        type="button"
        data-testid="derive-entropy"
        :disabled="entropy.isPending.value"
        @click="onDeriveEntropy"
      >
        Derive entropy (RFC-0007)
      </button>
      <code v-if="entropy.data.value" data-testid="entropy-result">{{ hexPreview(entropy.data.value) }}</code>
    </HookRow>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </UiCard>
</template>
