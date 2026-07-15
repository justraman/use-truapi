import {
  ss58ToH160,
  useFormattedBalance,
  useIsHost,
  usePaymentBalance,
  usePaymentStatus,
  useRequestPayment,
  useSelectedAccount,
  useTopUp,
} from "@use-truapi/react";
import { useState } from "react";
import { badge, errorText, heading, muted, panel, row } from "../ui";

export function PaymentsPanel() {
  const isHost = useIsHost();
  if (!isHost) {
    return (
      <section style={panel}>
        <h2 style={heading}>Payments</h2>
        <p data-testid="payments-unavailable">host only</p>
      </section>
    );
  }
  return <HostPayments />;
}

function HostPayments() {
  const selected = useSelectedAccount();
  const balance = usePaymentBalance();
  const available = useFormattedBalance(balance.data?.available, { decimals: 10, symbol: "PAS" });
  const topUp = useTopUp();
  const request = useRequestPayment();
  const [lastPaymentId, setLastPaymentId] = useState<string | undefined>(undefined);
  const status = usePaymentStatus(lastPaymentId);

  const error = balance.error ?? topUp.error ?? request.error ?? status.error;

  return (
    <section style={panel}>
      <h2 style={heading}>Payments (RFC-0006)</h2>
      <div style={row}>
        <span style={badge} data-testid="payment-balance">
          purse: {available || "—"}
        </span>
        <button
          type="button"
          data-testid="payment-topup"
          disabled={topUp.isPending}
          onClick={() =>
            void topUp
              .topUp(1_000_000_000n /* 0.1 PAS */, {
                tag: "ProductAccount",
                value: { derivationIndex: 0 },
              })
              .catch(() => {})
          }
        >
          Top up 0.1 PAS
        </button>
        <button
          type="button"
          data-testid="payment-request"
          disabled={!selected || request.isPending}
          onClick={() => {
            if (!selected) return;
            void request
              .request(500_000_000n /* 0.05 PAS */, ss58ToH160(selected.address))
              .then(({ id }) => setLastPaymentId(id))
              .catch(() => {});
          }}
        >
          Request 0.05 PAS to self
        </button>
      </div>
      {lastPaymentId && (
        <p style={muted}>
          Payment <code>{lastPaymentId}</code>:{" "}
          <span data-testid="payment-status">{status.data?.tag ?? "…"}</span>
          {status.data?.tag === "Failed" && ` (${status.data.value.reason})`}
        </p>
      )}
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
