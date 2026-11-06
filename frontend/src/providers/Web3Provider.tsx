"use client";

import React, { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../config/wagmi";
import { QueryProvider } from "./QueryProvider";
import { WalletModalProvider } from "./WalletModal";
import { ToastProvider } from "../components/ui/Toast";
import { RpcHealthCheck } from "../components/RpcHealthCheck";

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryProvider>
        <WalletModalProvider>
          <ToastProvider>
            <RpcHealthCheck />
            {children}
          </ToastProvider>
        </WalletModalProvider>
      </QueryProvider>
    </WagmiProvider>
  );
}
