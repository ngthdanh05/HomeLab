import { createConfig, fallback, http } from "wagmi";
import { sepolia, anvil } from "wagmi/chains";
import { injected, walletConnect, type WalletConnectParameters } from "wagmi/connectors";
import { getSepoliaRpcUrls } from "@/lib/rpc";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

/** Sepolia endpoints in priority order (exported for the RPC health check). */
export const SEPOLIA_RPC_URLS = getSepoliaRpcUrls(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);

const RPC_OPTIONS = { timeout: 15_000, retryCount: 2 } as const;

/**
 * WalletConnect connector that stays dormant until it is actually used.
 *
 * wagmi initialises every connector on page load (connector.setup() and
 * reconnect() both call getProvider()), which downloaded and booted the
 * WalletConnect SDK (~400 KiB) and opened a relay connection for every visitor.
 * Now the SDK loads only when the user connects through WalletConnect, or when
 * their last connection was WalletConnect (so the session is still restored).
 */
function lazyWalletConnect(parameters: WalletConnectParameters): ReturnType<typeof walletConnect> {
  const createWalletConnect = walletConnect(parameters);
  return (config) => {
    const base = createWalletConnect(config);
    let active = false;
    const isActive = async () => {
      if (active) return true;
      try {
        return (await config.storage?.getItem("recentConnectorId")) === base.id;
      } catch {
        return false;
      }
    };

    return {
      ...base,
      async setup() {
        if (await isActive()) await base.setup?.call(base);
      },
      async getProvider(params) {
        if (!(await isActive())) return undefined as unknown as Awaited<ReturnType<typeof base.getProvider>>;
        return base.getProvider.call(base, params);
      },
      async isAuthorized() {
        return (await isActive()) && base.isAuthorized.call(base);
      },
      connect: ((params) => {
        active = true;
        return base.connect.call(base, params);
      }) as typeof base.connect,
    };
  };
}

export const config = createConfig({
  chains: [sepolia, anvil],
  connectors: [
    injected({ target: "metaMask" }),
    ...(walletConnectProjectId
      ? [
          lazyWalletConnect({
            projectId: walletConnectProjectId,
            showQrModal: false,
          }),
        ]
      : []),
  ],
  transports: {
    // Configured RPC first; public endpoints take over when it errors or is rate-limited.
    [sepolia.id]: fallback(SEPOLIA_RPC_URLS.map((url) => http(url, RPC_OPTIONS))),
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
  // App Router pre-renders client components on the server; this keeps the
  // first client render in sync with it and avoids hydration mismatches.
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
