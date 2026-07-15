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
import { badge, errorText, heading, hexPreview, muted, panel, row } from "../ui";

export function AccountsPanel() {
  const { accounts, selectedAccount, isConnected, isConnecting, error, select } = useAccounts();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const selected = useSelectedAccount();
  const signer = useSigner();
  const userId = useUserId();
  const login = useLogin();
  const signRaw = useSignRaw();

  return (
    <section style={panel}>
      <h2 style={heading}>Account</h2>
      {isConnected ? (
        <div style={row}>
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
          {selected && (
            <code data-testid="selected-account">{truncateAddress(selected.address)}</code>
          )}
          <span style={badge} data-testid="signer-status">
            signer: {signer ? "ready" : "none"}
          </span>
          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid="connect"
          disabled={isConnecting || connect.isPending}
          onClick={() => void connect.connect().catch(() => {})}
        >
          {isConnecting || connect.isPending ? "Connecting…" : "Connect"}
        </button>
      )}
      <div style={{ ...row, marginTop: 8 }}>
        <span style={badge} data-testid="user-id">
          user: {userId.data ?? "—"}
        </span>
        <button
          type="button"
          data-testid="login"
          disabled={login.isPending}
          onClick={() => void login.login().catch(() => {})}
        >
          Login (RFC-0009)
        </button>
        {login.data && <span style={muted}>login: {login.data}</span>}
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
      </div>
      {(error ?? connect.error ?? login.error ?? signRaw.error) && (
        <p style={errorText}>{(error ?? connect.error ?? login.error ?? signRaw.error)?.message}</p>
      )}
    </section>
  );
}
