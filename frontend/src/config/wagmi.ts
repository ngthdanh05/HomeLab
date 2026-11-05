import { createConfig, fallback, http } from "wagmi";
import { sepolia, anvil } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { getSepoliaRpcUrls } from "@/lib/rpc";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

/** Sepolia endpoints in priority order (exported for the RPC health check). */
export const SEPOLIA_RPC_URLS = getSepoliaRpcUrls(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);

const RPC_OPTIONS = { timeout: 15_000, retryCount: 2 } as const;

export const config = createConfig({
  chains: [sepolia, anvil],
  connectors: [
    injected({ target: "metaMask" }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
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
