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
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

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
  void signRaw.sign(new TextEncoder().encode("gm from use-truapi")).catch(() => {});
}
</script>

<template>
  <UiCard title="Accounts" desc="Wallet connection, account selection and signing.">
    <HookRow :hook="['useConnect', 'useDisconnect']">
      <button v-if="isConnected" type="button" @click="disconnect()">Disconnect</button>
      <button
        v-else
        type="button"
        class="primary"
        data-testid="connect"
        :disabled="isConnecting || connect.isPending.value"
        @click="connect.connect().catch(() => {})"
      >
        {{ isConnecting || connect.isPending.value ? "Connecting…" : "Connect" }}
      </button>
    </HookRow>
    <HookRow hook="useAccounts">
      <template v-if="isConnected">
        <select data-testid="account-select" :value="selectedAccount?.address ?? ''" @change="onSelect">
          <option v-for="account in accounts" :key="account.address" :value="account.address">
            {{ account.name ?? truncateAddress(account.address) }}
          </option>
        </select>
        <span class="badge">{{ accounts.length }} account{{ accounts.length === 1 ? "" : "s" }}</span>
      </template>
      <span v-else class="muted">connect to list accounts</span>
    </HookRow>
    <HookRow hook="useSelectedAccount">
      <code v-if="selected" data-testid="selected-account">{{ truncateAddress(selected.address) }}</code>
      <span v-else class="muted">no account selected</span>
    </HookRow>
    <HookRow hook="useSigner">
      <span class="badge" data-testid="signer-status">signer: {{ signer ? "ready" : "none" }}</span>
    </HookRow>
    <HookRow hook="useUserId">
      <span class="badge" data-testid="user-id">user: {{ userId.data.value ?? "—" }}</span>
    </HookRow>
    <HookRow hook="useLogin">
      <button
        type="button"
        data-testid="login"
        :disabled="login.isPending.value"
        @click="login.login().catch(() => {})"
      >
        Login (RFC-0009)
      </button>
      <span v-if="login.data.value" class="muted">login: {{ login.data.value }}</span>
    </HookRow>
    <HookRow hook="useSignRaw">
      <button
        type="button"
        data-testid="sign-raw"
        :disabled="!isConnected || signRaw.isPending.value"
        @click="onSignRaw"
      >
        Sign message
      </button>
      <code v-if="signRaw.data.value" data-testid="sign-raw-result">{{ hexPreview(signRaw.data.value) }}</code>
    </HookRow>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </UiCard>
</template>
