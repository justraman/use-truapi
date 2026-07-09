<script setup lang="ts">
import {
  truncateAddress,
  useAccounts,
  useBalance,
  useBlockNumber,
  useFormattedBalance,
  useHostMode,
  useHostStorage,
  useIsHost,
  usePublishStatement,
  useStatements,
  useTheme,
} from "@use-truapi/vue";
import { computed, ref } from "vue";

const hostMode = useHostMode();
const theme = useTheme();
const dark = computed(() => theme.value.variant === "dark");

const { accounts, selectedAccount, isConnected, isConnecting, error, connect, disconnect, select } =
  useAccounts();

const block = useBlockNumber();
const balance = useBalance(() => selectedAccount.value?.address);
const formattedBalance = useFormattedBalance(
  () => balance.data.value?.free,
  { decimals: 10, symbol: "PAS" },
);

const note = useHostStorage<string>("example-note");
const noteDraft = ref("");

const isHost = useIsHost();
interface NoteStatement {
  text: string;
}
const { statements, error: statementsError } = useStatements<NoteStatement>({
  enabled: () => isHost.value,
});
const publish = usePublishStatement<NoteStatement>();
const statementDraft = ref("");

function onConnect() {
  void connect().catch(() => {});
}

function onSelect(event: Event) {
  select((event.target as HTMLSelectElement).value);
}

function onPublish() {
  void publish.run({ text: statementDraft.value }).catch(() => {});
}
</script>

<template>
  <div
    data-testid="app-root"
    :data-theme="theme.variant"
    :style="{
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '640px',
      margin: '0 auto',
      padding: '24px',
      minHeight: '100vh',
      background: dark ? '#16161a' : '#ffffff',
      color: dark ? '#eee' : '#111',
    }"
  >
    <header style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px">
      <h1 style="font-size: 20px; margin: 0; flex: 1">use-truapi example (Vue)</h1>
      <span class="badge" data-testid="host-mode">{{ hostMode }}</span>
      <span class="badge" data-testid="theme">
        {{ theme.variant }}{{ theme.custom ? ` (${theme.custom})` : "" }}
      </span>
    </header>

    <section class="panel">
      <h2>Account</h2>
      <div v-if="isConnected" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <select data-testid="account-select" :value="selectedAccount?.address ?? ''" @change="onSelect">
          <option v-for="account in accounts" :key="account.address" :value="account.address">
            {{ account.name ?? truncateAddress(account.address) }}
          </option>
        </select>
        <code v-if="selectedAccount" data-testid="selected-account">
          {{ truncateAddress(selectedAccount.address) }}
        </code>
        <button type="button" @click="disconnect()">Disconnect</button>
      </div>
      <button v-else type="button" data-testid="connect" :disabled="isConnecting" @click="onConnect">
        {{ isConnecting ? "Connecting…" : "Connect" }}
      </button>
      <p v-if="error" style="color: #c33">{{ error.message }}</p>
    </section>

    <section class="panel">
      <h2>Chain</h2>
      <p>Block: <span data-testid="block-number">{{ block.data.value ?? "—" }}</span></p>
      <p>
        Balance:
        <span data-testid="balance">
          {{ selectedAccount ? (formattedBalance !== "" ? formattedBalance : "—") : "connect an account" }}
        </span>
      </p>
    </section>

    <section class="panel">
      <h2>Note (host storage)</h2>
      <p>Saved: <span data-testid="note-value">{{ note.data.value ?? "(empty)" }}</span></p>
      <div style="display: flex; gap: 8px">
        <input data-testid="note-input" v-model="noteDraft" placeholder="Type a note" />
        <button type="button" data-testid="note-save" @click="void note.set(noteDraft)">Save</button>
      </div>
    </section>

    <section class="panel">
      <h2>Statements</h2>
      <p v-if="!isHost" data-testid="statements-unavailable">host only</p>
      <template v-else>
        <ul data-testid="statements">
          <li v-for="(statement, i) in statements" :key="`${statement.signerHex ?? 'anon'}-${i}`">
            {{ statement.data.text }}
          </li>
        </ul>
        <div style="display: flex; gap: 8px">
          <input data-testid="statement-input" v-model="statementDraft" placeholder="Broadcast a message" />
          <button
            type="button"
            data-testid="statement-publish"
            :disabled="publish.isPending.value || statementDraft === ''"
            @click="onPublish"
          >
            Publish
          </button>
        </div>
        <p v-if="statementsError" style="color: #c33">{{ statementsError.message }}</p>
      </template>
    </section>
  </div>
</template>

<style scoped>
.panel {
  border: 1px solid #8884;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.panel h2 {
  font-size: 16px;
  margin-top: 0;
}
.badge {
  border: 1px solid #8886;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 13px;
  font-family: monospace;
}
</style>
