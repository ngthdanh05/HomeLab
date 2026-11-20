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
        // Đồng bộ với token trong globals.css (ConnectKit không đọc được CSS variables dạng kênh RGB).
        "--ck-font-family": "var(--font-be-vietnam-pro), Arial, sans-serif",
        "--ck-border-radius": "20px",
        "--ck-accent-color": "#0E6375",
        "--ck-accent-text-color": "#FFFFFF",
        "--ck-body-background": "#FFFFFF",
        "--ck-body-background-secondary": "#F7F9F9",
        "--ck-body-background-tertiary": "#E3F2F5",
        "--ck-body-color": "#132A33",
        "--ck-body-color-muted": "#4D646D",
        "--ck-body-color-muted-hover": "#132A33",
        "--ck-body-divider": "#DCE5E6",
        "--ck-primary-button-background": "#F7F9F9",
        "--ck-primary-button-hover-background": "#E3F2F5",
        "--ck-primary-button-color": "#132A33",
        "--ck-primary-button-border-radius": "12px",
        "--ck-secondary-button-background": "#F7F9F9",
        "--ck-secondary-button-hover-background": "#E3F2F5",
        "--ck-secondary-button-border-radius": "12px",
        "--ck-focus-color": "#0E6375",
        "--ck-overlay-background": "rgba(19, 42, 51, 0.45)",
      }}
      mode="light"
      // Connect on the chain the app is built for (NEXT_PUBLIC_CHAIN_ID); ConnectKit
      // otherwise asks the wallet to switch to the first configured chain (Sepolia).
      options={{ initialChainId: DEFAULT_CHAIN_ID, language: t("vi-VN", "en-US") }}
    >
      <ModalOpener openRequest={openRequest} />
    </ConnectKitProvider>
  );
}
