import { useBatchTx, useTx } from "@use-truapi/react";
import { Binary } from "polkadot-api";
import { Card, HookRow } from "../ui";

export function TxPanel() {
  const tx = useTx();
  const batch = useBatchTx();

  return (
    <Card title="Transactions" desc="Sign and submit extrinsics, single or batched.">
      <HookRow hook="useTx">
        <button
          type="button"
          data-testid="tx-remark"
          disabled={tx.isPending}
          onClick={() =>
            void tx
              .submit((api) =>
                api.tx.System.remark({ remark: Binary.fromText("gm from use-truapi") }),
              )
              .catch(() => {})
          }
        >
          Submit remark
        </button>
        <span className="badge" data-testid="tx-phase">
          {tx.phase}
        </span>
        {tx.data && (
          <span className="muted" data-testid="tx-result">
            {tx.data.ok ? `in block #${tx.data.block.number}` : "dispatch failed"}
          </span>
        )}
      </HookRow>
      <HookRow hook="useBatchTx">
        <button
          type="button"
          data-testid="batch-remark"
          disabled={batch.isPending}
          onClick={() =>
            void batch
              .submit((api) => [
                api.tx.System.remark({ remark: Binary.fromText("batch 1/2") }),
                api.tx.System.remark({ remark: Binary.fromText("batch 2/2") }),
              ])
              .catch(() => {})
          }
        >
          Submit batch (2 remarks)
        </button>
        <span className="badge" data-testid="batch-phase">
          {batch.phase}
        </span>
        {batch.data && (
          <span className="muted" data-testid="batch-result">
            {batch.data.ok ? `in block #${batch.data.block.number}` : "dispatch failed"}
          </span>
        )}
      </HookRow>
      {(tx.error ?? batch.error) && <p className="error">{(tx.error ?? batch.error)?.message}</p>}
    </Card>
  );
}
