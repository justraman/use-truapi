import {
  truncateAddress,
  useContract,
  useContractAt,
  useContractQuery,
  useContractTx,
  useEnsureAccountMapped,
} from "@use-truapi/react";
import { COUNTER_LIBRARY, cdmJson, counterAbi, counterAddress } from "../counter-contract";
import { Card, HookRow } from "../ui";

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
    <Card
      title={`Contracts · ${COUNTER_LIBRARY}`}
      desc={`Counter contract at ${counterAddress ? truncateAddress(counterAddress) : "(no address in cdm.json)"} on Asset Hub.`}
    >
      <HookRow hook="useContract">
        <span className="badge">
          handle: {contract.data ? "resolved from cdm.json" : "resolving…"}
        </span>
      </HookRow>
      <HookRow hook="useContractQuery">
        <span className="muted">getCount()</span>
        <span className="value" data-testid="counter-value">
          {count.data?.toString() ?? "—"}
        </span>
      </HookRow>
      <HookRow hook="useContractTx">
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
      </HookRow>
      <HookRow hook="useEnsureAccountMapped">
        <button
          type="button"
          data-testid="map-account"
          disabled={mapAccount.isPending}
          onClick={() => void mapAccount.ensureMapped().catch(() => {})}
        >
          Map account
        </button>
        <span className="muted">one-time pallet-revive mapping before the first tx</span>
      </HookRow>
      <HookRow hook="useContractAt">
        <span className="muted">ad-hoc handle (address + ABI) reads the same value</span>
        <span className="value" data-testid="counter-value-adhoc">
          {adhocCount.data?.toString() ?? "—"}
        </span>
      </HookRow>
      {error && <p className="error">{error.message}</p>}
    </Card>
  );
}
