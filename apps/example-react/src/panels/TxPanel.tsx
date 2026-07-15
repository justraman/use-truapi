import { useBatchTx, useTx } from "@use-truapi/react";
import { Binary } from "polkadot-api";
import { badge, errorText, heading, muted, panel, row } from "../ui";

export function TxPanel() {
  const tx = useTx();
  const batch = useBatchTx();

  return (
    <section style={panel}>
      <h2 style={heading}>Transactions</h2>
      <div style={row}>
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
        <span style={badge} data-testid="tx-phase">
          {tx.phase}
        </span>
        {tx.data && (
          <span style={muted} data-testid="tx-result">
            {tx.data.ok ? `in block #${tx.data.block.number}` : "dispatch failed"}
          </span>
        )}
      </div>
      <div style={{ ...row, marginTop: 8 }}>
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
        <span style={badge} data-testid="batch-phase">
          {batch.phase}
        </span>
        {batch.data && (
          <span style={muted} data-testid="batch-result">
            {batch.data.ok ? `in block #${batch.data.block.number}` : "dispatch failed"}
          </span>
        )}
      </div>
      {(tx.error ?? batch.error) && <p style={errorText}>{(tx.error ?? batch.error)?.message}</p>}
    </section>
  );
}
