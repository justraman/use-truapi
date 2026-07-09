import {
  truncateAddress,
  useAccounts,
  useBalance,
  useBlockNumber,
  useFormattedBalance,
  useHostMode,
  useHostStorage,
  useIsHost,
  usePublishStatement,
  useSelectedAccount,
  useStatements,
  useTheme,
} from "@use-truapi/react";
import { useState, type CSSProperties } from "react";

const panel: CSSProperties = {
  border: "1px solid #8884",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

const badge: CSSProperties = {
  border: "1px solid #8886",
  borderRadius: 999,
  padding: "2px 10px",
  fontSize: 13,
  fontFamily: "monospace",
};

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
      <Header />
      <AccountsPanel />
      <ChainPanel />
      <NotesPanel />
      <StatementsPanel />
    </div>
  );
}

function Header() {
  const hostMode = useHostMode();
  const theme = useTheme();
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <h1 style={{ fontSize: 20, margin: 0, flex: 1 }}>use-truapi example (React)</h1>
      <span style={badge} data-testid="host-mode">
        {hostMode}
      </span>
      <span style={badge} data-testid="theme">
        {theme.variant}
        {theme.custom ? ` (${theme.custom})` : ""}
      </span>
    </header>
  );
}

function AccountsPanel() {
  const { accounts, selectedAccount, isConnected, isConnecting, error, connect, disconnect, select } =
    useAccounts();
  return (
    <section style={panel}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Account</h2>
      {isConnected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select
            data-testid="account-select"
            value={selectedAccount?.address ?? ""}
            onChange={(e) => select(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.address} value={account.address}>
                {account.name ?? truncateAddress(account.address)}
              </option>
            ))}
          </select>
          {selectedAccount && (
            <code data-testid="selected-account">{truncateAddress(selectedAccount.address)}</code>
          )}
          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="connect"
          disabled={isConnecting}
          onClick={() => void connect().catch(() => {})}
        >
          {isConnecting ? "Connecting…" : "Connect"}
        </button>
      )}
      {error && <p style={{ color: "#c33" }}>{error.message}</p>}
    </section>
  );
}

function ChainPanel() {
  const selected = useSelectedAccount();
  const block = useBlockNumber();
  const balance = useBalance(selected?.address);
  const formatted = useFormattedBalance(balance.data?.free, { decimals: 10, symbol: "PAS" });
  return (
    <section style={panel}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Chain</h2>
      <p>
        Block: <span data-testid="block-number">{block.data ?? "—"}</span>
      </p>
      <p>
        Balance:{" "}
        <span data-testid="balance">
          {selected ? (formatted !== "" ? formatted : "—") : "connect an account"}
        </span>
      </p>
    </section>
  );
}

function NotesPanel() {
  const note = useHostStorage<string>("example-note");
  const [draft, setDraft] = useState("");
  return (
    <section style={panel}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Note (host storage)</h2>
      <p>
        Saved: <span data-testid="note-value">{note.data ?? "(empty)"}</span>
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          data-testid="note-input"
          value={draft}
          placeholder="Type a note"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="button" data-testid="note-save" onClick={() => void note.set(draft)}>
          Save
        </button>
      </div>
    </section>
  );
}

interface NoteStatement {
  text: string;
}

function StatementsPanel() {
  const isHost = useIsHost();
  const { statements, error } = useStatements<NoteStatement>({ enabled: isHost });
  const publish = usePublishStatement<NoteStatement>();
  const [draft, setDraft] = useState("");

  if (!isHost) {
    return (
      <section style={panel}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Statements</h2>
        <p data-testid="statements-unavailable">host only</p>
      </section>
    );
  }
  return (
    <section style={panel}>
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Statements</h2>
      <ul data-testid="statements">
        {statements.map((statement, i) => (
          <li key={`${statement.signerHex ?? "anon"}-${i}`}>{statement.data.text}</li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          data-testid="statement-input"
          value={draft}
          placeholder="Broadcast a message"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          data-testid="statement-publish"
          disabled={publish.isPending || draft === ""}
          onClick={() => void publish.run({ text: draft }).catch(() => {})}
        >
          Publish
        </button>
      </div>
      {error && <p style={{ color: "#c33" }}>{error.message}</p>}
    </section>
  );
}
