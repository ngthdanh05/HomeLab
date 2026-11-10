"use client";

import React, { useSyncExternalStore } from "react";
import { useAccount } from "wagmi";
import { useI18n } from "@/providers/LocaleProvider";
import { useWalletModal } from "@/providers/WalletModal";

const noopSubscribe = () => () => {};

/** Same format as ConnectKit's button: 0x7099••••79C8. */
export function formatWalletAddress(address: string): string {
  return `${address.slice(0, 6)}••••${address.slice(-4)}`;
}

/** Deterministic two-colour gradient from the address (stands in for ConnectKit's avatar). */
export function addressGradient(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(12, "0");
  const hue1 = parseInt(hex.slice(0, 6), 16) % 360;
  const hue2 = (hue1 + 40 + (parseInt(hex.slice(6, 12), 16) % 140)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 80% 55%), hsl(${hue2} 75% 45%))`;
}

/**
 * Lightweight replacement for <ConnectKitButton />: rendered with the page,
 * while ConnectKit itself is only downloaded when the modal is opened
 * (prefetched on hover/focus).
 */
export function ConnectWalletButton({ className = "" }: { className?: string }) {
  const { address, isConnecting } = useAccount();
  const { open, prefetch } = useWalletModal();
  const { t } = useI18n();
  // Wallet state exists only in the browser; render the connect label on the server
  // and in the first client render so hydration matches.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const shown = mounted ? address : undefined;

  return (
    <button
      type="button"
      onClick={open}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      aria-busy={mounted && isConnecting && !address}
      className={`inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${className}`}
    >
      {shown ? (
        <>
          <span className="h-6 w-6 rounded-full" style={{ background: addressGradient(shown) }} aria-hidden />
          <span className="font-mono">{formatWalletAddress(shown)}</span>
        </>
      ) : (
        t("Kết nối ví", "Connect Wallet")
      )}
    </button>
  );
}
