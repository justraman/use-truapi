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
import { Card, HookRow } from "../ui";

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
    <Card title="Chain" desc="Live chain state on Paseo Asset Hub.">
      <HookRow hook="useChainClient">
        <span className="badge" data-testid="chain-client">
          client: {client.isSuccess ? "connected" : "connecting"}
        </span>
      </HookRow>
      <HookRow hook="useTypedApi">
        <span className="badge" data-testid="typed-api">
          typed api: {api.isSuccess ? "ready" : "loading"}
        </span>
      </HookRow>
      <HookRow hook="useChainSpec">
        <span className="badge" data-testid="chain-spec">
          {spec.data?.name ?? "spec: n/a"}
        </span>
      </HookRow>
      <HookRow hook="useBlockNumber">
        <span className="value" data-testid="block-number">
          {block.data ?? "—"}
        </span>
      </HookRow>
      <HookRow hook={["useBalance", "useFormattedBalance"]}>
        <span data-testid="balance">
          {selected ? (formatted !== "" ? formatted : "—") : "connect an account"}
        </span>
      </HookRow>
      <HookRow hook="useChainQuery">
        <span className="muted">total issuance</span>
        <span data-testid="total-issuance">{formattedIssuance || "—"}</span>
      </HookRow>
      <HookRow hook="useChainSubscription">
        <span className="muted">chain time</span>
        <span data-testid="chain-time">
          {now.data !== undefined ? new Date(Number(now.data.value)).toLocaleTimeString() : "—"}
        </span>
      </HookRow>
    </Card>
  );
}
