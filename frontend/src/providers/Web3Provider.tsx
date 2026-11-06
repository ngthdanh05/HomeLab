"use client";

import React, { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { config } from "../config/wagmi";
import { DEFAULT_CHAIN_ID } from "../config/contracts";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "../components/ui/Toast";
import { RpcHealthCheck } from "../components/RpcHealthCheck";

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryProvider>
        <ConnectKitProvider
          customTheme={{
            "--ck-font-family": "var(--font-sans)",
            "--ck-border-radius": "12px",
            "--ck-accent-color": "#10B981",
            "--ck-accent-text-color": "#ffffff",
          }}
          mode="dark"
          // Connect on the chain the app is built for (NEXT_PUBLIC_CHAIN_ID); ConnectKit
          // otherwise asks the wallet to switch to the first configured chain (Sepolia).
          options={{ initialChainId: DEFAULT_CHAIN_ID }}
        >
          <ToastProvider>
            <RpcHealthCheck />
            {children}
          </ToastProvider>
        </ConnectKitProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
