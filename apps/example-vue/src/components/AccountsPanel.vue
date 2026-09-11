<script setup lang="ts">
import {
  type RingLocation,
  truncateAddress,
  useAccountAlias,
  useAccounts,
  useConnect,
  useCreateAccountProof,
  useDisconnect,
  useHostChainInfo,
  useIsHost,
  useLogin,
  useProductContext,
  useRegisterRingVrfKey,
  useRingVrfKeys,
  useRingVrfSign,
  useSelectedAccount,
  useSignRaw,
  useSignVrf,
  useSigner,
  useUserId,
} from "@use-truapi/vue";
import { computed } from "vue";
import { hexPreview } from "../ui";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

// "pop:polkadot.network/people-lite" — the lite personhood collection on the People chain.
const PEOPLE_LITE_COLLECTION =
  "0x706f703a706f6c6b61646f742e6e6574776f726b2f70656f706c652d6c697465" as const;
const encode = (text: string) => new TextEncoder().encode(text);

const { accounts, selectedAccount, isConnected, isConnecting, error, select } = useAccounts();
const connect = useConnect();
const disconnect = useDisconnect();
const selected = useSelectedAccount();
const signer = useSigner();
const userId = useUserId();
const login = useLogin();
const signRaw = useSignRaw();
const signVrf = useSignVrf();

// RFC-0024 personhood: ring-VRF keys live on the People chain, which the host
// names through RFC-0026 discovery; the proof context is this product's id.
const isHost = useIsHost();
const productContext = useProductContext();
const people = useHostChainInfo(["People"]);
const ring = computed<RingLocation | undefined>(() => {
  const genesis = people.data.value?.chains.People;
  return genesis
    ? { chainId: genesis, junctions: [{ tag: "CollectionId", value: PEOPLE_LITE_COLLECTION }] }
    : undefined;
});
const context = computed(() =>
  productContext.data.value
    ? {
        productId: productContext.data.value.productId,
        suffix: { tag: "Index" as const, value: 0 },
      }
    : undefined,
);
const keys = useRingVrfKeys(undefined, {
  disclosure: "PublicKey",
  query: { enabled: computed(() => isHost.value) },
});
const registerKey = useRegisterRingVrfKey({ mutation: { onSuccess: () => void keys.refetch() } });
const alias = useAccountAlias();
const proof = useCreateAccountProof();
const ringSign = useRingVrfSign();
const firstKey = computed(() => keys.data.value?.[0]);

const firstError = computed(
  () =>
    error.value ??
    connect.error.value ??
    login.error.value ??
    signRaw.error.value ??
    signVrf.error.value ??
    keys.error.value ??
    registerKey.error.value ??
    alias.error.value ??
    proof.error.value ??
    ringSign.error.value,
);

function onSelect(event: Event) {
  select((event.target as HTMLSelectElement).value);
}
function onSignRaw() {
  void signRaw.sign(encode("gm from use-truapi")).catch(() => {});
}
function onSignVrf() {
  void signVrf
    .sign(encode("use-truapi-example/vrf"), [{ label: encode("round"), value: encode("1") }])
    .catch(() => {});
}
function onRegisterKey() {
  if (ring.value) void registerKey.register(0, ring.value).catch(() => {});
}
function onAlias() {
  if (firstKey.value && context.value && ring.value)
    void alias.derive(firstKey.value.handle, context.value, ring.value).catch(() => {});
}
function onProve() {
  if (firstKey.value && context.value && ring.value)
    void proof
      .prove(firstKey.value.handle, context.value, ring.value, encode("Hello"))
      .catch(() => {});
}
function onRingSign() {
  if (firstKey.value) void ringSign.sign(firstKey.value.handle, encode("Hello")).catch(() => {});
}
</script>

<template>
  <UiCard title="Accounts" desc="Wallet connection, account selection, signing and personhood.">
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
    <HookRow hook="useSignVrf">
      <button type="button" data-testid="sign-vrf" :disabled="!isHost || signVrf.isPending.value" @click="onSignVrf">
        Sign VRF (RFC-0023)
      </button>
      <code v-if="signVrf.data.value" data-testid="sign-vrf-result">
        pre-output {{ hexPreview(signVrf.data.value.preOutput) }}
      </code>
      <span v-if="!isHost" class="muted">host only</span>
    </HookRow>
    <HookRow :hook="['useRingVrfKeys', 'useRegisterRingVrfKey']">
      <span class="badge" data-testid="ring-vrf-keys">
        {{ isHost ? `${keys.data.value?.length ?? 0} ring-VRF key${keys.data.value?.length === 1 ? "" : "s"}` : "host only" }}
      </span>
      <button
        type="button"
        data-testid="register-ring-vrf-key"
        :disabled="!ring || registerKey.isPending.value"
        @click="onRegisterKey"
      >
        Register key #0 (RFC-0024)
      </button>
    </HookRow>
    <HookRow :hook="['useAccountAlias', 'useCreateAccountProof', 'useRingVrfSign']">
      <button
        type="button"
        data-testid="ring-vrf-alias"
        :disabled="!firstKey || !context || !ring || alias.isPending.value"
        @click="onAlias"
      >
        Alias
      </button>
      <button
        type="button"
        data-testid="ring-vrf-proof"
        :disabled="!firstKey || !context || !ring || proof.isPending.value"
        @click="onProve"
      >
        Prove membership
      </button>
      <button type="button" data-testid="ring-vrf-sign" :disabled="!firstKey || ringSign.isPending.value" @click="onRingSign">
        Ring sign
      </button>
      <code v-if="alias.data.value" data-testid="ring-vrf-alias-result">alias {{ hexPreview(alias.data.value.alias) }}</code>
      <code v-if="proof.data.value" data-testid="ring-vrf-proof-result">ring #{{ proof.data.value.ringIndex }}</code>
      <code v-if="ringSign.data.value" data-testid="ring-vrf-sign-result">{{ hexPreview(ringSign.data.value) }}</code>
      <span v-if="!firstKey && isHost" class="muted">register a key first</span>
    </HookRow>
    <p v-if="firstError" class="error">{{ firstError.message }}</p>
  </UiCard>
</template>
