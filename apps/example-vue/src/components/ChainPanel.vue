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
  <section class="panel">
    <h2>Chain</h2>
    <div class="row">
      <span class="badge" data-testid="chain-client">
        client: {{ client.isSuccess.value ? "connected" : "connecting" }}
      </span>
      <span class="badge" data-testid="typed-api">
        typed api: {{ api.isSuccess.value ? "ready" : "loading" }}
      </span>
      <span class="badge" data-testid="chain-spec">{{ spec.data.value?.name ?? "spec: n/a" }}</span>
    </div>
    <p>Block: <span data-testid="block-number">{{ block.data.value ?? "—" }}</span></p>
    <p>
      Balance:
      <span data-testid="balance">
        {{ selected ? (formatted !== "" ? formatted : "—") : "connect an account" }}
      </span>
    </p>
    <p class="muted">
      Total issuance: <span data-testid="total-issuance">{{ formattedIssuance || "—" }}</span>
      ·
      Chain time:
      <span data-testid="chain-time">
        {{ now.data.value !== undefined ? new Date(Number(now.data.value.value)).toLocaleTimeString() : "—" }}
      </span>
    </p>
  </section>
</template>
