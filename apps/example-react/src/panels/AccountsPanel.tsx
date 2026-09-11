import {
  type RingLocation,
  truncateAddress,
  useAccountAlias,
  useAccounts,
  useConnect,
  useCreateAccountProof,
  useDisconnect,
  useHostChainInfo,
  useIsHost,
  useLogin,
  useProductContext,
  useRegisterRingVrfKey,
  useRingVrfKeys,
  useRingVrfSign,
  useSelectedAccount,
  useSignRaw,
  useSignVrf,
  useSigner,
  useUserId,
} from "@use-truapi/react";
import { Card, HookRow, hexPreview } from "../ui";

// "pop:polkadot.network/people-lite" — the lite personhood collection on the People chain.
const PEOPLE_LITE_COLLECTION =
  "0x706f703a706f6c6b61646f742e6e6574776f726b2f70656f706c652d6c697465" as const;

const encode = (text: string) => new TextEncoder().encode(text);

export function AccountsPanel() {
  const { accounts, selectedAccount, isConnected, isConnecting, error, select } = useAccounts();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const selected = useSelectedAccount();
  const signer = useSigner();
  const userId = useUserId();
  const login = useLogin();
  const signRaw = useSignRaw();
  const signVrf = useSignVrf();

  // RFC-0024 personhood: ring-VRF keys live on the People chain, which the host
  // names through RFC-0026 discovery; the proof context is this product's id.
  const isHost = useIsHost();
  const productContext = useProductContext();
  const people = useHostChainInfo(["People"]);
  const peopleGenesis = people.data?.chains.People;
  const ring: RingLocation | undefined = peopleGenesis
    ? {
        chainId: peopleGenesis,
        junctions: [{ tag: "CollectionId", value: PEOPLE_LITE_COLLECTION }],
      }
    : undefined;
  const context = productContext.data
    ? { productId: productContext.data.productId, suffix: { tag: "Index" as const, value: 0 } }
    : undefined;
  const keys = useRingVrfKeys(undefined, { disclosure: "PublicKey", query: { enabled: isHost } });
  const registerKey = useRegisterRingVrfKey({ mutation: { onSuccess: () => void keys.refetch() } });
  const alias = useAccountAlias();
  const proof = useCreateAccountProof();
  const ringSign = useRingVrfSign();
  const firstKey = keys.data?.[0];

  const firstError =
    error ??
    connect.error ??
    login.error ??
    signRaw.error ??
    signVrf.error ??
    keys.error ??
    registerKey.error ??
    alias.error ??
    proof.error ??
    ringSign.error;

  return (
    <Card title="Accounts" desc="Wallet connection, account selection, signing and personhood.">
      <HookRow hook={["useConnect", "useDisconnect"]}>
        {isConnected ? (
          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            data-testid="connect"
            disabled={isConnecting || connect.isPending}
            onClick={() => void connect.connect().catch(() => {})}
          >
            {isConnecting || connect.isPending ? "Connecting…" : "Connect"}
          </button>
        )}
      </HookRow>
      <HookRow hook="useAccounts">
        {isConnected ? (
          <>
            <select
              data-testid="account-select"
              value={selectedAccount?.address ?? ""}
              onChange={(e) => select(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.name ?? truncateAddress(account.address)}
                </option>
              ))}
            </select>
            <span className="badge">
              {accounts.length} account{accounts.length === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          <span className="muted">connect to list accounts</span>
        )}
      </HookRow>
      <HookRow hook="useSelectedAccount">
        {selected ? (
          <code data-testid="selected-account">{truncateAddress(selected.address)}</code>
        ) : (
          <span className="muted">no account selected</span>
        )}
      </HookRow>
      <HookRow hook="useSigner">
        <span className="badge" data-testid="signer-status">
          signer: {signer ? "ready" : "none"}
        </span>
      </HookRow>
      <HookRow hook="useUserId">
        <span className="badge" data-testid="user-id">
          user: {userId.data ?? "—"}
        </span>
      </HookRow>
      <HookRow hook="useLogin">
        <button
          type="button"
          data-testid="login"
          disabled={login.isPending}
          onClick={() => void login.login().catch(() => {})}
        >
          Login (RFC-0009)
        </button>
        {login.data && <span className="muted">login: {login.data}</span>}
      </HookRow>
      <HookRow hook="useSignRaw">
        <button
          type="button"
          data-testid="sign-raw"
          disabled={!isConnected || signRaw.isPending}
          onClick={() => void signRaw.sign(encode("gm from use-truapi")).catch(() => {})}
        >
          Sign message
        </button>
        {signRaw.data && <code data-testid="sign-raw-result">{hexPreview(signRaw.data)}</code>}
      </HookRow>
      <HookRow hook="useSignVrf">
        <button
          type="button"
          data-testid="sign-vrf"
          disabled={!isHost || signVrf.isPending}
          onClick={() =>
            void signVrf
              .sign(encode("use-truapi-example/vrf"), [
                { label: encode("round"), value: encode("1") },
              ])
              .catch(() => {})
          }
        >
          Sign VRF (RFC-0023)
        </button>
        {signVrf.data && (
          <code data-testid="sign-vrf-result">pre-output {hexPreview(signVrf.data.preOutput)}</code>
        )}
        {!isHost && <span className="muted">host only</span>}
      </HookRow>
      <HookRow hook={["useRingVrfKeys", "useRegisterRingVrfKey"]}>
        <span className="badge" data-testid="ring-vrf-keys">
          {isHost
            ? `${keys.data?.length ?? 0} ring-VRF key${keys.data?.length === 1 ? "" : "s"}`
            : "host only"}
        </span>
        <button
          type="button"
          data-testid="register-ring-vrf-key"
          disabled={!ring || registerKey.isPending}
          onClick={() => {
            if (ring) void registerKey.register(0, ring).catch(() => {});
          }}
        >
          Register key #0 (RFC-0024)
        </button>
      </HookRow>
      <HookRow hook={["useAccountAlias", "useCreateAccountProof", "useRingVrfSign"]}>
        <button
          type="button"
          data-testid="ring-vrf-alias"
          disabled={!firstKey || !context || !ring || alias.isPending}
          onClick={() => {
            if (firstKey && context && ring)
              void alias.derive(firstKey.handle, context, ring).catch(() => {});
          }}
        >
          Alias
        </button>
        <button
          type="button"
          data-testid="ring-vrf-proof"
          disabled={!firstKey || !context || !ring || proof.isPending}
          onClick={() => {
            if (firstKey && context && ring)
              void proof.prove(firstKey.handle, context, ring, encode("Hello")).catch(() => {});
          }}
        >
          Prove membership
        </button>
        <button
          type="button"
          data-testid="ring-vrf-sign"
          disabled={!firstKey || ringSign.isPending}
          onClick={() => {
            if (firstKey) void ringSign.sign(firstKey.handle, encode("Hello")).catch(() => {});
          }}
        >
          Ring sign
        </button>
        {alias.data && (
          <code data-testid="ring-vrf-alias-result">alias {hexPreview(alias.data.alias)}</code>
        )}
        {proof.data && (
          <code data-testid="ring-vrf-proof-result">ring #{proof.data.ringIndex}</code>
        )}
        {ringSign.data && (
          <code data-testid="ring-vrf-sign-result">{hexPreview(ringSign.data)}</code>
        )}
        {!firstKey && isHost && <span className="muted">register a key first</span>}
      </HookRow>
      {firstError && <p className="error">{firstError.message}</p>}
    </Card>
  );
}
