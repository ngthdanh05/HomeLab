"use client";

// Loaded on demand by WalletModalProvider: everything from "connectkit" stays in this chunk.
import React, { useEffect, useRef } from "react";
import { ConnectKitProvider, useModal } from "connectkit";
import { DEFAULT_CHAIN_ID } from "../config/contracts";
import { useI18n } from "./LocaleProvider";

function ModalOpener({ openRequest }: { openRequest: number }) {
  const { setOpen } = useModal();
  const handled = useRef(0);
  useEffect(() => {
    // setOpen changes identity whenever ConnectKit re-renders (e.g. moving from the
    // wallet list to "Requesting connection"); re-opening then would reset the modal
    // to its first screen. Open once per open() call.
    if (openRequest <= handled.current) return;
    // Child effects run before ConnectKitProvider's own mount effects, which would
    // reset an open issued in the same commit, so open on the next task.
    const timer = setTimeout(() => {
      handled.current = openRequest;
      setOpen(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [openRequest, setOpen]);
  return null;
}

/** ConnectKit's provider + modal, mounted beside the app (inside WagmiProvider). */
export function ConnectKitLayer({ openRequest }: { openRequest: number }) {
  const { t } = useI18n();
  return (
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
      options={{ initialChainId: DEFAULT_CHAIN_ID, language: t("vi-VN", "en-US") }}
    >
      <ModalOpener openRequest={openRequest} />
    </ConnectKitProvider>
  );
}
