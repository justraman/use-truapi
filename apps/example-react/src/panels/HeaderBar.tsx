import { useFeatureSupported, useHostMode, useTheme } from "@use-truapi/react";
import { config } from "../config";
import { badge } from "../ui";

export function HeaderBar() {
  const hostMode = useHostMode();
  const theme = useTheme();
  const chainSupported = useFeatureSupported({
    tag: "Chain",
    value: config.chains.assetHub.genesisHash,
  });
  return (
    <header
      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
    >
      <h1 style={{ fontSize: 20, margin: 0, flex: 1 }}>use-truapi example (React)</h1>
      <span style={badge} data-testid="host-mode">
        {hostMode}
      </span>
      <span style={badge} data-testid="theme">
        {theme.variant}
        {theme.custom ? ` (${theme.custom})` : ""}
      </span>
      <span style={badge} data-testid="chain-supported">
        chain:{" "}
        {chainSupported.data === undefined
          ? "…"
          : chainSupported.data
            ? "supported"
            : "unsupported"}
      </span>
    </header>
  );
}
