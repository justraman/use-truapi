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
} from "@use-truapi/react";
import { config } from "../config";

export function HeaderBar() {
  const runtime = useRuntime();
  const hostMode = useHostMode();
  const connection = useHostConnectionStatus();
  const theme = useTheme();
  const locale = useLocale();
  const hostInfo = useHostInfo();
  const productContext = useProductContext();
  // RFC-0026: prefer the genesis the host actually serves over the config's fallback.
  const discovered = useHostChainInfo(["AssetHub"]);
  const genesisHash = discovered.data?.chains.AssetHub ?? config.chains.assetHub.genesisHash;
  const chainSupported = useFeatureSupported(
    genesisHash ? { tag: "Chain", value: genesisHash } : undefined,
  );
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">use-truapi example (React)</h1>
        <p className="app-sub">
          Every hook in the SDK, one live demo each — the chip names the hook driving the control
          next to it.
        </p>
      </div>
      <div className="header-badges">
        <div className="header-badge">
          <code className="hook-chip">useRuntime</code>
          <span className="badge" data-testid="runtime-dapp">
            {runtime.config.dappName} · {Object.keys(runtime.config.chains).join(", ")}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useHostMode</code>
          <span className="badge" data-testid="host-mode">
            {hostMode}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useHostConnectionStatus</code>
          <span className="badge" data-testid="host-connection">
            {connection}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useHostInfo</code>
          <span className="badge" data-testid="host-info">
            {hostInfo.data
              ? `${hostInfo.data.name} ${hostInfo.data.version} (${hostInfo.data.platform})`
              : hostInfo.isPending
                ? "…"
                : "no host info"}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useProductContext</code>
          <span className="badge" data-testid="product-context">
            {productContext.data?.productId ??
              (productContext.isPending ? "…" : "no product context")}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useTheme</code>
          <span className="badge" data-testid="theme">
            {theme.variant}
            {theme.custom ? ` (${theme.custom})` : ""}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useLocale</code>
          <span className="badge" data-testid="locale">
            {locale.languageTag} · {locale.source}
          </span>
        </div>
        <div className="header-badge">
          <code className="hook-chip">useFeatureSupported</code>
          <span className="badge" data-testid="chain-supported">
            chain:{" "}
            {chainSupported.data === undefined
              ? "…"
              : chainSupported.data
                ? "supported"
                : "unsupported"}
          </span>
        </div>
      </div>
    </header>
  );
}
