import { useCid, useStorageAuthorization, useUpload } from "@use-truapi/react";
import { useState } from "react";
import { Card, HookRow } from "../ui";

export function StoragePanel() {
  const authorization = useStorageAuthorization();
  const upload = useUpload();
  const [lastCid, setLastCid] = useState<string | undefined>(undefined);
  const fetched = useCid(lastCid);
  const [draft, setDraft] = useState("");

  const error = authorization.error ?? upload.error ?? fetched.error;

  return (
    <Card title="Cloud storage" desc="CID-addressed storage on the Bulletin chain.">
      <HookRow hook="useStorageAuthorization">
        <span className="badge" data-testid="storage-authorization">
          {authorization.data
            ? authorization.data.authorized
              ? `quota: ${authorization.data.remainingTransactions} txns / ${authorization.data.remainingBytes} bytes`
              : "not authorized"
            : "checking quota…"}
        </span>
      </HookRow>
      <HookRow hook="useUpload">
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
            void upload
              .upload(new TextEncoder().encode(draft))
              .then((result) => setLastCid(result.cid?.toString()))
              .catch(() => {})
          }
        >
          {upload.isPending ? "Uploading…" : "Upload"}
        </button>
      </HookRow>
      <HookRow hook="useCid">
        {lastCid ? (
          <span className="muted">
            CID <code data-testid="upload-cid">{lastCid}</code> reads back:{" "}
            <span data-testid="cid-content">
              {fetched.data ? new TextDecoder().decode(fetched.data) : "fetching…"}
            </span>
          </span>
        ) : (
          <span className="muted">upload something to read it back by CID</span>
        )}
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
