"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, type ComponentType } from "react";

/**
 * ConnectKit (its modal plus framer-motion and qrcode, ~100 KiB gzip) is only
 * needed once someone opens the wallet modal, so it is loaded on demand instead
 * of with every page. Components call `useWalletModal().open()` in place of
 * ConnectKit's `useModal().setOpen(true)`.
 */
interface WalletModalApi {
  /** Opens ConnectKit's modal (connect when disconnected, account view when connected). */
  open: () => void;
  /** Starts downloading ConnectKit (e.g. on hover) so the first open is instant. */
  prefetch: () => void;
}

const WalletModalContext = createContext<WalletModalApi>({ open: () => {}, prefetch: () => {} });

type LayerComponent = ComponentType<{ openRequest: number }>;

const loadLayer = () => import("./ConnectKitLayer").then((m) => m.ConnectKitLayer);

export function WalletModalProvider({ children }: { children: React.ReactNode }) {
  const [Layer, setLayer] = useState<LayerComponent | null>(null);
  // Bumped on every open() so the layer can open the modal again after it was closed.
  const [openRequest, setOpenRequest] = useState(0);

  const prefetch = useCallback(() => {
    void loadLayer()
      .then((component) => setLayer(() => component))
      .catch((error) => console.error("Could not load the wallet modal", error));
  }, []);

  const open = useCallback(() => {
    setOpenRequest((n) => n + 1);
    prefetch();
  }, [prefetch]);

  const api = useMemo(() => ({ open, prefetch }), [open, prefetch]);

  return (
    <WalletModalContext.Provider value={api}>
      {children}
      {Layer && <Layer openRequest={openRequest} />}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal(): WalletModalApi {
  return useContext(WalletModalContext);
}
