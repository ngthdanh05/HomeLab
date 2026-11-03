import { createConfig, http } from "wagmi";
import { sepolia, anvil } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

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
    [sepolia.id]: http(),
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
});
