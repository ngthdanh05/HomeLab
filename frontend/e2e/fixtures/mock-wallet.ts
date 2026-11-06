// In-page EIP-1193 provider that stands in for MetaMask during E2E runs.
// It reports one Anvil dev account and forwards every other request to Anvil,
// which signs eth_sendTransaction itself (its dev accounts are unlocked).

export interface MockWalletOptions {
  account: string;
  rpcUrl: string;
  chainId: number;
}

/**
 * Runs in the browser before any page script (page.addInitScript), so wagmi's
 * injected "metaMask" connector and EIP-6963 discovery both find it.
 * Must be self-contained: it is serialized into the page.
 */
export function installMockWallet({ account, rpcUrl, chainId }: MockWalletOptions) {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  const chainIdHex = `0x${chainId.toString(16)}`;
  let connected = false;
  let nextId = 1;

  const provider = {
    isMetaMask: true,
    async request({ method, params }: { method: string; params?: unknown[] }) {
      switch (method) {
        case "eth_requestAccounts":
          // Remembered across page loads, like a real wallet's site permission.
          connected = true;
          window.localStorage.setItem("e2e.connected", "1");
          return [account];
        case "eth_accounts":
          return connected || window.localStorage.getItem("e2e.connected") === "1" ? [account] : [];
        case "eth_chainId":
          return chainIdHex;
        case "net_version":
          return String(chainId);
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain": {
          // Only the Anvil chain exists in this wallet; like MetaMask, answer 4902 otherwise.
          const [{ chainId: requested }] = (params ?? [{}]) as Array<{ chainId?: string }>;
          if (requested && Number(requested) !== chainId) {
            const error = new Error(`Unrecognized chain ID "${requested}".`) as Error & { code?: number };
            error.code = 4902;
            throw error;
          }
          // wagmi waits for this event after a switch request.
          setTimeout(() => (listeners.chainChanged ?? []).forEach((fn) => fn(chainIdHex)), 0);
          return null;
        }
        case "wallet_watchAsset":
          return true;
        case "wallet_requestPermissions":
        case "wallet_getPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions":
          connected = false;
          window.localStorage.removeItem("e2e.connected");
          return null;
        case "eth_sendTransaction": {
          const [tx] = (params ?? []) as Array<Record<string, unknown>>;
          params = [{ ...tx, from: account }];
          break;
        }
      }
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params: params ?? [] }),
      });
      const body = (await response.json()) as {
        result?: unknown;
        error?: { code: number; message: string; data?: unknown };
      };
      if (body.error) {
        const error = new Error(body.error.message) as Error & { code?: number; data?: unknown };
        error.code = body.error.code;
        error.data = body.error.data;
        throw error;
      }
      return body.result;
    },
    on(event: string, fn: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(fn);
      return provider;
    },
    removeListener(event: string, fn: (...args: unknown[]) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
      return provider;
    },
  };

  Object.defineProperty(window, "ethereum", { value: provider, configurable: true, writable: true });

  const announce = () =>
    window.dispatchEvent(
      new CustomEvent("eip6963:announceProvider", {
        detail: Object.freeze({
          info: {
            uuid: "4a1b6d2e-e2e0-4f00-9000-000000000001",
            name: "MetaMask",
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'/>",
            rdns: "io.metamask",
          },
          provider,
        }),
      }),
    );
  window.addEventListener("eip6963:requestProvider", announce);
  announce();
}
