import { useCid, useStorageAuthorization, useUpload } from "@use-truapi/react";
import { useState } from "react";
import { badge, errorText, heading, muted, panel, row } from "../ui";

export function StoragePanel() {
  const authorization = useStorageAuthorization();
  const upload = useUpload();
  const [lastCid, setLastCid] = useState<string | undefined>(undefined);
  const fetched = useCid(lastCid);
  const [draft, setDraft] = useState("");

  const error = authorization.error ?? upload.error ?? fetched.error;

  return (
    <section style={panel}>
      <h2 style={heading}>Cloud storage (Bulletin)</h2>
      <div style={row}>
        <span style={badge} data-testid="storage-authorization">
          {authorization.data
            ? authorization.data.authorized
              ? `quota: ${authorization.data.remainingTransactions} txns / ${authorization.data.remainingBytes} bytes`
              : "not authorized"
            : "checking quota…"}
        </span>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <input
          data-testid="upload-input"
          value={draft}
          placeholder="Bytes to store"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          data-testid="upload-submit"
          disabled={upload.isPending || draft === ""}
          onClick={() =>
            upload.mutate(
              { data: new TextEncoder().encode(draft) },
              { onSuccess: (result) => setLastCid(result.cid?.toString()) },
            )
          }
        >
          {upload.isPending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {lastCid && (
        <p style={muted}>
          CID <code data-testid="upload-cid">{lastCid}</code> reads back:{" "}
          <span data-testid="cid-content">
            {fetched.data ? new TextDecoder().decode(fetched.data) : "fetching…"}
          </span>
        </p>
      )}
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
