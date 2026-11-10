"use client";

import React, { useSyncExternalStore } from "react";
import { useWalletModal } from "@/providers/WalletModal";
import { useAccount } from "wagmi";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { BadgeGallery } from "@/components/dashboard/BadgeGallery";
import { TokenBalance } from "@/components/dashboard/TokenBalance";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";

const noopSubscribe = () => () => {};

export default function DashboardPage() {
  const { t } = useI18n();
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const { chainId, explorerUrl, isWrongNetwork } = useActiveChain();
  const { open: openWalletModal, prefetch } = useWalletModal();
  // Wallet state only exists in the browser; render the connect prompt only on the
  // client so the server HTML matches the first client render.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  // Only the silent auto-reconnect on page load gets a skeleton; while the user
  // is answering a wallet prompt the connect card stays (with a busy button).
  if (!mounted || (isReconnecting && !address)) {
    return <div className="h-48 animate-pulse rounded-3xl bg-slate-900" aria-label={t("Đang tải", "Loading")} />;
  }

  if (!isConnected || !address) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center">
        <p className="text-5xl">🔐</p>
        <h1 className="mt-3 text-2xl font-bold text-white">{t("Kết nối ví để xem Dashboard", "Connect your wallet to view the Dashboard")}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {t(
            "Dashboard hiển thị số dư EcoToken, NFT ImpactBadge và lịch sử giao dịch của ví đang kết nối.",
            "The Dashboard shows the EcoToken balance, ImpactBadge NFTs and transaction history of the connected wallet.",
          )}
        </p>
        <button
          type="button"
          onClick={openWalletModal}
          onPointerEnter={prefetch}
          onFocus={prefetch}
          className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          {isConnecting ? t("Đang chờ xác nhận trong ví…", "Waiting for wallet confirmation…") : t("Kết nối ví", "Connect wallet")}
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-emerald-800/80 bg-emerald-950/80 px-3 py-1 text-xs font-semibold text-emerald-400">
            👤 {t("Dashboard cá nhân", "Personal Dashboard")} · {getChainName(chainId)}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {t("Tác động của bạn", "Your impact")}
          </h1>
        </div>
        {explorerUrl ? (
          <a
            href={`${explorerUrl}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-slate-400 hover:text-emerald-400"
          >
            {shortenAddress(address, 6)} ↗
          </a>
        ) : (
          <span className="font-mono text-sm text-slate-400">{shortenAddress(address, 6)}</span>
        )}
      </section>

      {isWrongNetwork && (
        <p className="rounded-2xl border border-amber-800/60 bg-amber-950/40 p-4 text-sm text-amber-200">
          {t(
            `Ví đang ở mạng chưa được hỗ trợ — dữ liệu dưới đây được đọc từ ${getChainName(chainId)}. Hãy chuyển ví sang ${getChainName(chainId)}.`,
            `Your wallet is on an unsupported network. The data below is read from ${getChainName(chainId)}. Please switch your wallet to ${getChainName(chainId)}.`,
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TokenBalance owner={address} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed user={address} />
        </div>
      </div>

      <BadgeGallery owner={address} />
    </>
  );
}
