import {
  useBalance,
  useBlockNumber,
  useChainClient,
  useChainQuery,
  useChainSpec,
  useChainSubscription,
  useFormattedBalance,
  useSelectedAccount,
  useTypedApi,
} from "@use-truapi/react";
import { badge, heading, muted, panel, row } from "../ui";

export function ChainPanel() {
  const selected = useSelectedAccount();
  const client = useChainClient();
  const api = useTypedApi();
  const spec = useChainSpec();
  const block = useBlockNumber();
  const balance = useBalance(selected?.address);
  const formatted = useFormattedBalance(balance.data?.free, { decimals: 10, symbol: "PAS" });
  const totalIssuance = useChainQuery(
    (typedApi) => typedApi.query.Balances.TotalIssuance.getValue(),
    [],
  );
  const formattedIssuance = useFormattedBalance(totalIssuance.data, {
    decimals: 10,
    maxDecimals: 0,
    symbol: "PAS",
  });
  const now = useChainSubscription<{ value: bigint }>(
    (typedApi) => typedApi.query.Timestamp.Now.watchValue(),
    ["timestamp"],
  );

  return (
    <section style={panel}>
      <h2 style={heading}>Chain</h2>
      <div style={row}>
        <span style={badge} data-testid="chain-client">
          client: {client.isSuccess ? "connected" : "connecting"}
        </span>
        <span style={badge} data-testid="typed-api">
          typed api: {api.isSuccess ? "ready" : "loading"}
        </span>
        <span style={badge} data-testid="chain-spec">
          {spec.data?.name ?? "spec: n/a"}
        </span>
      </div>
      <p>
        Block: <span data-testid="block-number">{block.data ?? "—"}</span>
      </p>
      <p>
        Balance:{" "}
        <span data-testid="balance">
          {selected ? (formatted !== "" ? formatted : "—") : "connect an account"}
        </span>
      </p>
      <p style={muted}>
        Total issuance: <span data-testid="total-issuance">{formattedIssuance || "—"}</span>
        {" · "}
        Chain time:{" "}
        <span data-testid="chain-time">
          {now.data !== undefined ? new Date(Number(now.data.value)).toLocaleTimeString() : "—"}
        </span>
      </p>
    </section>
  );
}
