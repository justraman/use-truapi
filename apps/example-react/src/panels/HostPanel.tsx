import {
  useDeriveEntropy,
  useDevicePermission,
  useHostChainInfo,
  useHostNavigate,
  useHostStorage,
  useIsHost,
  useNotifications,
  usePermission,
  usePickContact,
  usePocketCards,
  useRemovePocketCard,
  useResourceAllocation,
  useWorkerOperation,
} from "@use-truapi/react";
import { useState } from "react";
import { Card, HookRow, hexPreview } from "../ui";

export function HostPanel() {
  const note = useHostStorage<string>("example-note");
  const navigate = useHostNavigate();
  const notifications = useNotifications();
  const permission = usePermission();
  const devicePermission = useDevicePermission();
  const allocation = useResourceAllocation();
  const entropy = useDeriveEntropy();
  // RFC-0026 discovery: which chains the host serves, by role.
  const chains = useHostChainInfo(["Relay", "AssetHub", "People", "Bulletin"]);
  const isHost = useIsHost();
  // Contacts: the host shows its own picker; the product only gets an opaque handle.
  const contact = usePickContact();
  // Worker lifecycle: keep the host from stopping a background runtime mid-task.
  const worker = useWorkerOperation();
  const [operationId, setOperationId] = useState<number | null>(null);
  const [workerError, setWorkerError] = useState<Error | null>(null);
  // Pocket: the product's own cards in the host's Pocket tab (host owns the set).
  const cards = usePocketCards({ enabled: isHost });
  const removeCard = useRemovePocketCard();
  const [draft, setDraft] = useState("");

  const error =
    notifications.error ??
    permission.error ??
    devicePermission.error ??
    allocation.error ??
    entropy.error ??
    chains.error ??
    contact.error ??
    workerError ??
    removeCard.error ??
    (isHost ? cards.error : null);

  return (
    <Card
      title="Host capabilities"
      desc="Standalone these reject with HostUnavailableError — run inside a host to try them."
    >
      <HookRow hook="useHostStorage">
        <span className="muted">
          saved note: <span data-testid="note-value">{note.data ?? "(empty)"}</span>
        </span>
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
      </HookRow>
      <HookRow hook="useHostNavigate">
        <button
          type="button"
          data-testid="host-navigate"
          onClick={() => void navigate("https://polkadot.com").catch(() => {})}
        >
          Open polkadot.com
        </button>
      </HookRow>
      <HookRow hook="useNotifications">
        <button
          type="button"
          data-testid="notify"
          disabled={notifications.isPending}
          onClick={() =>
            void notifications.push({ text: "Hello from use-truapi!" }).catch(() => {})
          }
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
      </HookRow>
      <HookRow hook="usePermission">
        <button
          type="button"
          data-testid="request-permission"
          disabled={permission.isPending}
          onClick={() => void permission.request({ tag: "StatementSubmit" }).catch(() => {})}
        >
          Statement permission
        </button>
        {permission.data !== undefined && (
          <span className="badge" data-testid="permission-result">
            {permission.data ? "granted" : "denied"}
          </span>
        )}
      </HookRow>
      <HookRow hook="useDevicePermission">
        <button
          type="button"
          data-testid="request-device-permission"
          disabled={devicePermission.isPending}
          onClick={() => void devicePermission.request("Notifications").catch(() => {})}
        >
          Device notifications
        </button>
        {devicePermission.data !== undefined && (
          <span className="badge" data-testid="device-permission-result">
            {devicePermission.data ? "granted" : "denied"}
          </span>
        )}
      </HookRow>
      <HookRow hook="useResourceAllocation">
        <button
          type="button"
          data-testid="request-allocation"
          disabled={allocation.isPending}
          onClick={() =>
            void allocation.request([{ tag: "StatementStoreAllowance" }]).catch(() => {})
          }
        >
          Statement allowance (RFC-0010)
        </button>
        {allocation.data && (
          <span className="badge" data-testid="allocation-result">
            {allocation.data.join(", ")}
          </span>
        )}
      </HookRow>
      <HookRow hook="useHostChainInfo">
        {chains.data ? (
          <span className="muted" data-testid="host-chains">
            network <code>{chains.data.network}</code>:{" "}
            {Object.entries(chains.data.chains)
              .map(([role, genesis]) => `${role} ${genesis.slice(0, 10)}…`)
              .join(" · ")}
          </span>
        ) : (
          <span className="muted" data-testid="host-chains">
            {chains.isPending
              ? "discovering chains…"
              : "no chain discovery (standalone or legacy host)"}
          </span>
        )}
      </HookRow>
      <HookRow hook="usePickContact">
        <button
          type="button"
          data-testid="pick-contact"
          disabled={!isHost || contact.isPending}
          onClick={() => void contact.pick().catch(() => {})}
        >
          Pick a contact
        </button>
        {contact.data && (
          <span className="badge" data-testid="pick-contact-result">
            {contact.data.tag === "Picked"
              ? `picked ${contact.data.value.handle.bytes.slice(0, 10)}…`
              : contact.data.tag}
          </span>
        )}
        {!isHost && <span className="muted">host only</span>}
      </HookRow>
      <HookRow hook="useWorkerOperation">
        <button
          type="button"
          data-testid="worker-begin"
          disabled={!isHost || operationId !== null}
          onClick={() =>
            void worker
              .begin("example")
              .then((id) => {
                setOperationId(id);
                setWorkerError(null);
              })
              .catch((e: Error) => setWorkerError(e))
          }
        >
          Begin operation
        </button>
        <button
          type="button"
          data-testid="worker-end"
          disabled={operationId === null}
          onClick={() => {
            if (operationId === null) return;
            void worker
              .end(operationId)
              .then(() => setOperationId(null))
              .catch((e: Error) => setWorkerError(e));
          }}
        >
          End operation
        </button>
        <span className="muted" data-testid="worker-operation">
          {operationId === null ? "no open operation" : `operation #${operationId} open`}
        </span>
      </HookRow>
      <HookRow hook={["usePocketCards", "useRemovePocketCard"]}>
        <span className="badge" data-testid="pocket-cards">
          {isHost
            ? `${cards.data?.length ?? 0} pocket card${cards.data?.length === 1 ? "" : "s"}`
            : "host only"}
        </span>
        <button
          type="button"
          data-testid="pocket-remove"
          disabled={!cards.data?.length || removeCard.isPending}
          onClick={() => {
            const first = cards.data?.[0];
            if (first) void removeCard.remove(first.cardId).catch(() => {});
          }}
        >
          Remove first card
        </button>
      </HookRow>
      <HookRow hook="useDeriveEntropy">
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
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
