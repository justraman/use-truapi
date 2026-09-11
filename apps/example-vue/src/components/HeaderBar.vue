<script setup lang="ts">
import {
  useFeatureSupported,
  useHostChainInfo,
  useHostConnectionStatus,
  useHostInfo,
  useHostMode,
  useLocale,
  useProductContext,
  useRuntime,
  useTheme,
} from "@use-truapi/vue";
import { computed } from "vue";
import { config } from "../config";

const runtime = useRuntime();
const hostMode = useHostMode();
const connection = useHostConnectionStatus();
const theme = useTheme();
const locale = useLocale();
const hostInfo = useHostInfo();
const productContext = useProductContext();
// RFC-0026: prefer the genesis the host actually serves over the config's fallback.
const discovered = useHostChainInfo(["AssetHub"]);
const genesisHash = computed(
  () => discovered.data.value?.chains.AssetHub ?? config.chains.assetHub.genesisHash,
);
const chainSupported = useFeatureSupported(() =>
  genesisHash.value ? { tag: "Chain" as const, value: genesisHash.value } : undefined,
);
const chainNames = Object.keys(runtime.config.chains).join(", ");
const hostInfoLabel = computed(() => {
  const info = hostInfo.data.value;
  if (info) return `${info.name} ${info.version} (${info.platform})`;
  return hostInfo.isPending.value ? "…" : "no host info";
});
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
        <code class="hook-chip">useHostConnectionStatus</code>
        <span class="badge" data-testid="host-connection">{{ connection }}</span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useHostInfo</code>
        <span class="badge" data-testid="host-info">{{ hostInfoLabel }}</span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useProductContext</code>
        <span class="badge" data-testid="product-context">
          {{ productContext.data.value?.productId ?? (productContext.isPending.value ? "…" : "no product context") }}
        </span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useTheme</code>
        <span class="badge" data-testid="theme">
          {{ theme.variant }}{{ theme.custom ? ` (${theme.custom})` : "" }}
        </span>
      </div>
      <div class="header-badge">
        <code class="hook-chip">useLocale</code>
        <span class="badge" data-testid="locale">{{ locale.languageTag }} · {{ locale.source }}</span>
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
