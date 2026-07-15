<script setup lang="ts">
import {
  useIsHost,
  usePublishStatement,
  useSelectedAccount,
  useStatementChannel,
  useStatements,
} from "@use-truapi/vue";
import { ref } from "vue";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

interface NoteStatement {
  text: string;
}

interface PresenceValue {
  timestamp: number;
  address?: string;
}

const isHost = useIsHost();
const selected = useSelectedAccount();
const { data: statements, error } = useStatements<NoteStatement>({
  enabled: () => isHost.value,
});
const publish = usePublishStatement<NoteStatement>();
// Last-write-wins channel — one live value per peer, keyed by channel name.
const presence = useStatementChannel<PresenceValue>({ topic2: "presence" });
const draft = ref("");

const DESC = "Ephemeral broadcast messages on the statement store.";

function onPublish() {
  void publish.publish({ text: draft.value }).catch(() => {});
}

function onPresence() {
  void presence.write("presence", {
    timestamp: Date.now(),
    address: selected.value?.address,
  });
}
</script>

<template>
  <UiCard title="Statements" :desc="DESC">
    <HookRow v-if="!isHost" :hook="['useStatements', 'usePublishStatement', 'useStatementChannel']">
      <span class="muted" data-testid="statements-unavailable">host only</span>
    </HookRow>
    <template v-else>
      <HookRow hook="useStatements">
        <span v-if="(statements ?? []).length === 0" class="muted">no statements yet</span>
        <ul v-else class="list" data-testid="statements">
          <li v-for="(statement, i) in statements ?? []" :key="`${statement.signerHex ?? 'anon'}-${i}`">
            {{ statement.data.text }}
          </li>
        </ul>
      </HookRow>
      <HookRow hook="usePublishStatement">
        <input data-testid="statement-input" v-model="draft" placeholder="Broadcast a message" />
        <button
          type="button"
          data-testid="statement-publish"
          :disabled="publish.isPending.value || draft === ''"
          @click="onPublish"
        >
          Publish
        </button>
      </HookRow>
      <HookRow hook="useStatementChannel">
        <button type="button" data-testid="presence-write" :disabled="!presence.ready.value" @click="onPresence">
          I'm here
        </button>
        <span class="badge" data-testid="presence-count">
          presence: {{ presence.values.value.size }} peer{{ presence.values.value.size === 1 ? "" : "s" }}
        </span>
        <span v-if="!presence.ready.value" class="muted">channel connecting…</span>
      </HookRow>
      <p v-if="error" class="error">{{ error.message }}</p>
    </template>
  </UiCard>
</template>
