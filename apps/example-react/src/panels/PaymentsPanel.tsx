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
import { Card, HookRow } from "../ui";

const DESC = "RFC-0006 payments through the host purse.";

export function PaymentsPanel() {
  const isHost = useIsHost();
  if (!isHost) {
    return (
      <Card title="Payments" desc={DESC}>
        <HookRow hook={["usePaymentBalance", "useTopUp", "useRequestPayment"]}>
          <span className="muted" data-testid="payments-unavailable">
            host only
          </span>
        </HookRow>
      </Card>
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
    <Card title="Payments" desc={DESC}>
      <HookRow hook="usePaymentBalance">
        <span className="badge" data-testid="payment-balance">
          purse: {available || "—"}
        </span>
      </HookRow>
      <HookRow hook="useTopUp">
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
      </HookRow>
      <HookRow hook="useRequestPayment">
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
      </HookRow>
      <HookRow hook="usePaymentStatus">
        {lastPaymentId ? (
          <span className="muted">
            payment <code>{lastPaymentId}</code>:{" "}
            <span data-testid="payment-status">{status.data?.tag ?? "…"}</span>
            {status.data?.tag === "Failed" && ` (${status.data.value.reason})`}
          </span>
        ) : (
          <span className="muted">request a payment to watch its status</span>
        )}
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
