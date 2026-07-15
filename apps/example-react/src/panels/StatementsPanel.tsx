import {
  useIsHost,
  usePublishStatement,
  useSelectedAccount,
  useStatementChannel,
  useStatements,
} from "@use-truapi/react";
import { useState } from "react";
import { Card, HookRow } from "../ui";

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
      <Card title="Statements" desc="Ephemeral broadcast messages on the statement store.">
        <HookRow hook={["useStatements", "usePublishStatement", "useStatementChannel"]}>
          <span className="muted" data-testid="statements-unavailable">
            host only
          </span>
        </HookRow>
      </Card>
    );
  }
  return (
    <Card title="Statements" desc="Ephemeral broadcast messages on the statement store.">
      <HookRow hook="useStatements">
        {statements.length === 0 ? (
          <span className="muted">no statements yet</span>
        ) : (
          <ul className="list" data-testid="statements">
            {statements.map((statement, i) => (
              <li key={`${statement.signerHex ?? "anon"}-${i}`}>{statement.data.text}</li>
            ))}
          </ul>
        )}
      </HookRow>
      <HookRow hook="usePublishStatement">
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
      </HookRow>
      <HookRow hook="useStatementChannel">
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
        <span className="badge" data-testid="presence-count">
          presence: {presence.values.size} peer{presence.values.size === 1 ? "" : "s"}
        </span>
        {!presence.ready && <span className="muted">channel connecting…</span>}
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
