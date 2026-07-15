<script setup lang="ts">
import { useFeatureSupported, useHostMode, useRuntime, useTheme } from "@use-truapi/vue";
import { config } from "../config";

const runtime = useRuntime();
const hostMode = useHostMode();
const theme = useTheme();
const chainSupported = useFeatureSupported({
  tag: "Chain",
  value: config.chains.assetHub.genesisHash,
});
const chainNames = Object.keys(runtime.config.chains).join(", ");
</script>

<template>
  <header class="app-header">
    <div>
      <h1 class="app-title">use-truapi example (Vue)</h1>
      <p class="app-sub">
        Every composable in the SDK, one live demo each — the chip names the composable driving the
        control next to it.
      </p>
    </div>
    <div class="header-badges">
      <div class="header-badge">
        <code class="hook-chip">useRuntime</code>
        <span class="badge" data-testid="runtime-dapp">
          {{ runtime.config.dappName }} · {{ chainNames }}
        </span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useHostMode</code>
        <span class="badge" data-testid="host-mode">{{ hostMode }}</span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useTheme</code>
        <span class="badge" data-testid="theme">
          {{ theme.variant }}{{ theme.custom ? ` (${theme.custom})` : "" }}
        </span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useFeatureSupported</code>
        <span class="badge" data-testid="chain-supported">
          chain:
          {{ chainSupported.data.value === undefined ? "…" : chainSupported.data.value ? "supported" : "unsupported" }}
        </span>
      </div>
    </div>
  </header>
</template>
