import {
  truncateAddress,
  useContract,
  useContractAt,
  useContractQuery,
  useContractTx,
  useEnsureAccountMapped,
} from "@use-truapi/react";
import { COUNTER_LIBRARY, cdmJson, counterAbi, counterAddress } from "../counter-contract";
import { badge, errorText, heading, muted, panel, row } from "../ui";

export function ContractPanel() {
  // Manifest path: typed handle resolved from cdm.json.
  const contract = useContract(cdmJson, COUNTER_LIBRARY);
  const count = useContractQuery<bigint>(contract.data, "getCount", []);
  const refetchCount = () => void count.refetch();
  const increment = useContractTx(contract.data, "increment", {
    mutation: { onSuccess: refetchCount },
  });
  const addFive = useContractTx(contract.data, "add", {
    mutation: { onSuccess: refetchCount },
  });
  // One-time pallet-revive mapping, required before the first contract tx.
  const mapAccount = useEnsureAccountMapped(cdmJson);
  // Ad-hoc path: same contract through a raw address + ABI.
  const adhoc = useContractAt(counterAddress, counterAbi);
  const adhocCount = useContractQuery<bigint>(adhoc.data, "getCount", []);

  const error =
    contract.error ?? count.error ?? increment.error ?? addFive.error ?? mapAccount.error;

  return (
    <section style={panel}>
      <h2 style={heading}>
        Contract <span style={muted}>{COUNTER_LIBRARY}</span>
      </h2>
      <p style={muted}>
        {counterAddress ? truncateAddress(counterAddress) : "no address in cdm.json"} on Asset Hub
      </p>
      <div style={row}>
        <span style={badge}>
          count: <span data-testid="counter-value">{count.data?.toString() ?? "—"}</span>
        </span>
        <button
          type="button"
          data-testid="counter-increment"
          disabled={!contract.data || increment.isPending}
          onClick={() => void increment.send().catch(() => {})}
        >
          {increment.isPending ? "Incrementing…" : "Increment"}
        </button>
        <button
          type="button"
          data-testid="counter-add"
          disabled={!contract.data || addFive.isPending}
          onClick={() => void addFive.send([5n]).catch(() => {})}
        >
          Add 5
        </button>
        <button
          type="button"
          data-testid="map-account"
          disabled={mapAccount.isPending}
          onClick={() => void mapAccount.ensureMapped().catch(() => {})}
        >
          Map account
        </button>
      </div>
      <p style={muted}>
        Ad-hoc handle (useContractAt) reads the same value:{" "}
        <span data-testid="counter-value-adhoc">{adhocCount.data?.toString() ?? "—"}</span>
      </p>
      {error && <p style={errorText}>{error.message}</p>}
    </section>
  );
}
