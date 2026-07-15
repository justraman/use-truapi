import {
  useDeriveEntropy,
  useDevicePermission,
  useHostNavigate,
  useHostStorage,
  useNotifications,
  usePermission,
  useResourceAllocation,
} from "@use-truapi/react";
import { useState } from "react";
import { badge, errorText, heading, hexPreview, muted, panel, row } from "../ui";

export function HostPanel() {
  const note = useHostStorage<string>("example-note");
  const navigate = useHostNavigate();
  const notifications = useNotifications();
  const permission = usePermission();
  const devicePermission = useDevicePermission();
  const allocation = useResourceAllocation();
  const entropy = useDeriveEntropy();
  const [draft, setDraft] = useState("");

  const error =
    notifications.error ??
    permission.error ??
    devicePermission.error ??
    allocation.error ??
    entropy.error;

  return (
    <section style={panel}>
      <h2 style={heading}>Host capabilities</h2>
      <p>
        Saved note: <span data-testid="note-value">{note.data ?? "(empty)"}</span>
      </p>
      <div style={row}>
        <input
          data-testid="note-input"
          value={draft}
          placeholder="Type a note"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="button" data-testid="note-save" onClick={() => void note.set(draft)}>
          Save
        </button>
        <button type="button" data-testid="note-remove" onClick={() => void note.remove()}>
          Clear
        </button>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <button
          type="button"
          data-testid="host-navigate"
          onClick={() => void navigate("https://polkadot.com").catch(() => {})}
        >
          Open polkadot.com
        </button>
        <button
          type="button"
          data-testid="notify"
          disabled={notifications.isPending}
          onClick={() => void notifications.push({ text: "Hello from use-truapi!" }).catch(() => {})}
        >
          Push notification
        </button>
        <button
          type="button"
          data-testid="cancel-notification"
          disabled={notifications.data === undefined}
          onClick={() => {
            const id = notifications.data;
            if (id !== undefined) void notifications.cancel(id).catch(() => {});
          }}
        >
          Cancel it
        </button>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <button
          type="button"
          data-testid="request-permission"
          disabled={permission.isPending}
          onClick={() => void permission.request({ tag: "StatementSubmit" }).catch(() => {})}
        >
          Statement permission
        </button>
        {permission.data !== undefined && (
          <span style={badge} data-testid="permission-result">
            {permission.data ? "granted" : "denied"}
          </span>
        )}
        <button
          type="button"
          data-testid="request-device-permission"
          disabled={devicePermission.isPending}
          onClick={() => void devicePermission.request("Notifications").catch(() => {})}
        >
          Device notifications
        </button>
        {devicePermission.data !== undefined && (
          <span style={badge} data-testid="device-permission-result">
            {devicePermission.data ? "granted" : "denied"}
          </span>
        )}
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        <button
          type="button"
          data-testid="request-allocation"
          disabled={allocation.isPending}
          onClick={() => void allocation.request([{ tag: "StatementStoreAllowance" }]).catch(() => {})}
        >
          Statement allowance (RFC-0010)
        </button>
        {allocation.data && (
          <span style={badge} data-testid="allocation-result">
            {allocation.data.join(", ")}
          </span>
        )}
        <button
          type="button"
          data-testid="derive-entropy"
          disabled={entropy.isPending}
          onClick={() =>
            void entropy.derive(new TextEncoder().encode("use-truapi-example")).catch(() => {})
          }
        >
          Derive entropy (RFC-0007)
        </button>
        {entropy.data && <code data-testid="entropy-result">{hexPreview(entropy.data)}</code>}
      </div>
      <p style={muted}>
        Permissions, notifications, allocations and entropy are host capabilities — standalone they
        reject with HostUnavailableError.
      </p>
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
