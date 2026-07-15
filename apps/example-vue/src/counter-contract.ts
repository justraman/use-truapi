import type { AbiEntry, CdmJson } from "@use-truapi/vue";
// The manifest is produced by `cdm deploy` from `contracts/` (see
// contracts/counter/lib.rs for the source of the deployed counter).
import manifest from "../../../contracts/cdm.json";

export const COUNTER_LIBRARY = "@use-truapi/counter";

export const cdmJson = manifest as unknown as CdmJson;

const entry = cdmJson.contracts?.[COUNTER_LIBRARY];
export const counterAddress = entry?.address as `0x${string}` | undefined;
export const counterAbi: AbiEntry[] = entry?.abi ?? [];
