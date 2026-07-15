import {
  truncateAddress,
  useAccounts,
  useConnect,
  useDisconnect,
  useLogin,
  useSelectedAccount,
  useSignRaw,
  useSigner,
  useUserId,
} from "@use-truapi/react";
import { Card, HookRow, hexPreview } from "../ui";

export function AccountsPanel() {
  const { accounts, selectedAccount, isConnected, isConnecting, error, select } = useAccounts();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const selected = useSelectedAccount();
  const signer = useSigner();
  const userId = useUserId();
  const login = useLogin();
  const signRaw = useSignRaw();

  const firstError = error ?? connect.error ?? login.error ?? signRaw.error;

  return (
    <Card title="Accounts" desc="Wallet connection, account selection and signing.">
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
          onClick={() =>
            void signRaw.sign(new TextEncoder().encode("gm from use-truapi")).catch(() => {})
          }
        >
          Sign message
        </button>
        {signRaw.data && <code data-testid="sign-raw-result">{hexPreview(signRaw.data)}</code>}
      </HookRow>
      {firstError && <p className="error">{firstError.message}</p>}
    </Card>
  );
}
