<script setup lang="ts">
import { useFeatureSupported, useHostMode, useTheme } from "@use-truapi/vue";
import { config } from "../config";

const hostMode = useHostMode();
const theme = useTheme();
const chainSupported = useFeatureSupported({
  tag: "Chain",
  value: config.chains.assetHub.genesisHash,
});
</script>

<template>
  <header style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap">
    <h1 style="font-size: 20px; margin: 0; flex: 1">use-truapi example (Vue)</h1>
    <span class="badge" data-testid="host-mode">{{ hostMode }}</span>
    <span class="badge" data-testid="theme">
      {{ theme.variant }}{{ theme.custom ? ` (${theme.custom})` : "" }}
    </span>
    <span class="badge" data-testid="chain-supported">
      chain:
      {{ chainSupported.data.value === undefined ? "…" : chainSupported.data.value ? "supported" : "unsupported" }}
    </span>
  </header>
</template>
