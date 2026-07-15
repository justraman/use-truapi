import { useTheme } from "@use-truapi/react";
import { AccountsPanel } from "./panels/AccountsPanel";
import { ChainPanel } from "./panels/ChainPanel";
import { ChatPanel } from "./panels/ChatPanel";
import { ContractPanel } from "./panels/ContractPanel";
import { HeaderBar } from "./panels/HeaderBar";
import { HostPanel } from "./panels/HostPanel";
import { PaymentsPanel } from "./panels/PaymentsPanel";
import { StatementsPanel } from "./panels/StatementsPanel";
import { StoragePanel } from "./panels/StoragePanel";
import { TxPanel } from "./panels/TxPanel";

export function App() {
  const theme = useTheme();
  const dark = theme.variant === "dark";
  return (
    <div
      data-testid="app-root"
      data-theme={theme.variant}
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
        padding: 24,
        minHeight: "100vh",
        background: dark ? "#16161a" : "#ffffff",
        color: dark ? "#eee" : "#111",
      }}
    >
      <HeaderBar />
      <AccountsPanel />
      <ChainPanel />
      <TxPanel />
      <ContractPanel />
      <StatementsPanel />
      <ChatPanel />
      <PaymentsPanel />
      <StoragePanel />
      <HostPanel />
    </div>
  );
}
