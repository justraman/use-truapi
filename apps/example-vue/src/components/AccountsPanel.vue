<script setup lang="ts">
import {
  truncateAddress,
  useAccounts,
  useConnect,
  useDisconnect,
  useLogin,
  useSelectedAccount,
  useSignRaw,
  useSigner,
  useUserId,
} from "@use-truapi/vue";
import { computed } from "vue";
import { hexPreview } from "../ui";

const { accounts, selectedAccount, isConnected, isConnecting, error, select } = useAccounts();
const connect = useConnect();
const disconnect = useDisconnect();
const selected = useSelectedAccount();
const signer = useSigner();
const userId = useUserId();
const login = useLogin();
const signRaw = useSignRaw();

const firstError = computed(
  () => error.value ?? connect.error.value ?? login.error.value ?? signRaw.error.value,
);

function onSelect(event: Event) {
  select((event.target as HTMLSelectElement).value);
}

function onSignRaw() {
  signRaw.mutate(new TextEncoder().encode("gm from use-truapi"));
}
</script>

<template>
  <section class="panel">
    <h2>Account</h2>
    <div v-if="isConnected" class="row">
      <select data-testid="account-select" :value="selectedAccount?.address ?? ''" @change="onSelect">
        <option v-for="account in accounts" :key="account.address" :value="account.address">
          {{ account.name ?? truncateAddress(account.address) }}
        </option>
      </select>
      <code v-if="selected" data-testid="selected-account">{{ truncateAddress(selected.address) }}</code>
      <span class="badge" data-testid="signer-status">signer: {{ signer ? "ready" : "none" }}</span>
      <button type="button" @click="disconnect()">Disconnect</button>
    </div>
    <button
      v-else
      type="button"
      data-testid="connect"
      :disabled="isConnecting || connect.isPending.value"
      @click="connect.mutate()"
    >
      {{ isConnecting || connect.isPending.value ? "Connecting…" : "Connect" }}
    </button>
    <div class="row" style="margin-top: 8px">
      <span class="badge" data-testid="user-id">user: {{ userId.data.value ?? "—" }}</span>
      <button type="button" data-testid="login" :disabled="login.isPending.value" @click="login.mutate()">
        Login (RFC-0009)
      </button>
      <span v-if="login.data.value" class="muted">login: {{ login.data.value }}</span>
      <button
        type="button"
        data-testid="sign-raw"
        :disabled="!isConnected || signRaw.isPending.value"
        @click="onSignRaw"
      >
        Sign message
      </button>
      <code v-if="signRaw.data.value" data-testid="sign-raw-result">{{ hexPreview(signRaw.data.value) }}</code>
    </div>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </section>
</template>
