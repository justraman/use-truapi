<script setup lang="ts">
import {
  useBalance,
  useBlockNumber,
  useChainClient,
  useChainQuery,
  useChainSpec,
  useChainSubscription,
  useFormattedBalance,
  useSelectedAccount,
  useTypedApi,
} from "@use-truapi/vue";
import HookRow from "./HookRow.vue";
import UiCard from "./UiCard.vue";

const selected = useSelectedAccount();
const client = useChainClient();
const api = useTypedApi();
const spec = useChainSpec();
const block = useBlockNumber();
const balance = useBalance(() => selected.value?.address);
const formatted = useFormattedBalance(() => balance.data.value?.free, {
  decimals: 10,
  symbol: "PAS",
});
const totalIssuance = useChainQuery(
  (typedApi) => typedApi.query.Balances.TotalIssuance.getValue(),
  [],
);
const formattedIssuance = useFormattedBalance(() => totalIssuance.data.value, {
  decimals: 10,
  maxDecimals: 0,
  symbol: "PAS",
});
const now = useChainSubscription<{ value: bigint }>(
  (typedApi) => typedApi.query.Timestamp.Now.watchValue(),
  ["timestamp"],
);
</script>

<template>
  <UiCard title="Chain" desc="Live chain state on Paseo Asset Hub.">
    <HookRow hook="useChainClient">
      <span class="badge" data-testid="chain-client">
        client: {{ client.isSuccess.value ? "connected" : "connecting" }}
      </span>
    </HookRow>
    <HookRow hook="useTypedApi">
      <span class="badge" data-testid="typed-api">
        typed api: {{ api.isSuccess.value ? "ready" : "loading" }}
      </span>
    </HookRow>
    <HookRow hook="useChainSpec">
      <span class="badge" data-testid="chain-spec">{{ spec.data.value?.name ?? "spec: n/a" }}</span>
    </HookRow>
    <HookRow hook="useBlockNumber">
      <span class="value" data-testid="block-number">{{ block.data.value ?? "—" }}</span>
    </HookRow>
    <HookRow :hook="['useBalance', 'useFormattedBalance']">
      <span data-testid="balance">
        {{ selected ? (formatted !== "" ? formatted : "—") : "connect an account" }}
      </span>
    </HookRow>
    <HookRow hook="useChainQuery">
      <span class="muted">total issuance</span>
      <span data-testid="total-issuance">{{ formattedIssuance || "—" }}</span>
    </HookRow>
    <HookRow hook="useChainSubscription">
      <span class="muted">chain time</span>
      <span data-testid="chain-time">
        {{ now.data.value !== undefined ? new Date(Number(now.data.value.value)).toLocaleTimeString() : "—" }}
      </span>
    </HookRow>
  </UiCard>
</template>
