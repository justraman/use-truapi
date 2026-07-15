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
  return (
    <div className="app" data-testid="app-root" data-theme={theme.variant}>
      <div className="shell">
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
    </div>
  );
}
