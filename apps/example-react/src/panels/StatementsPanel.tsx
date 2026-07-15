import {
  useIsHost,
  usePublishStatement,
  useSelectedAccount,
  useStatementChannel,
  useStatements,
} from "@use-truapi/react";
import { useState } from "react";
import { badge, errorText, heading, muted, panel, row } from "../ui";

interface NoteStatement {
  text: string;
}

interface PresenceValue {
  timestamp: number;
  address?: string;
}

export function StatementsPanel() {
  const isHost = useIsHost();
  const selected = useSelectedAccount();
  const { data: statements = [], error } = useStatements<NoteStatement>({ enabled: isHost });
  const publish = usePublishStatement<NoteStatement>();
  // Last-write-wins channel — one live value per peer, keyed by channel name.
  const presence = useStatementChannel<PresenceValue>({ topic2: "presence" });
  const [draft, setDraft] = useState("");

  if (!isHost) {
    return (
      <section style={panel}>
        <h2 style={heading}>Statements</h2>
        <p data-testid="statements-unavailable">host only</p>
      </section>
    );
  }
  return (
    <section style={panel}>
      <h2 style={heading}>Statements</h2>
      <ul data-testid="statements">
        {statements.map((statement, i) => (
          <li key={`${statement.signerHex ?? "anon"}-${i}`}>{statement.data.text}</li>
        ))}
      </ul>
      <div style={row}>
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
          onClick={() => void publish.publish({ text: draft }).catch(() => {})}
        >
          Publish
        </button>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <button
          type="button"
          data-testid="presence-write"
          disabled={!presence.ready}
          onClick={() =>
            void presence.write("presence", {
              timestamp: Date.now(),
              address: selected?.address,
            })
          }
        >
          I'm here
        </button>
        <span style={badge} data-testid="presence-count">
          presence: {presence.values.size} peer{presence.values.size === 1 ? "" : "s"}
        </span>
        {!presence.ready && <span style={muted}>channel connecting…</span>}
      </div>
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
