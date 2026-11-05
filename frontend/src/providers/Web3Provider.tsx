"use client";

import React, { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { config } from "../config/wagmi";
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
