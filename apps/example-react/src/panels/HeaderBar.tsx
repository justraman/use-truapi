import { useFeatureSupported, useHostMode, useRuntime, useTheme } from "@use-truapi/react";
import { config } from "../config";

export function HeaderBar() {
  const runtime = useRuntime();
  const hostMode = useHostMode();
  const theme = useTheme();
  const chainSupported = useFeatureSupported({
    tag: "Chain",
    value: config.chains.assetHub.genesisHash,
  });
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
          <code className="hook-chip">useTheme</code>
          <span className="badge" data-testid="theme">
            {theme.variant}
            {theme.custom ? ` (${theme.custom})` : ""}
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
