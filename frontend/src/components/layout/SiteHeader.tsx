"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";

const NAV_LINKS = [
  { href: "/", label: "🌿 Khám phá" },
  { href: "/marketplace", label: "🧺 Marketplace" },
  { href: "/carbon-tracker", label: "🌍 Carbon" },
  { href: "/quests", label: "🎯 Quests" },
  { href: "/dashboard", label: "🏅 Dashboard" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { chainId, walletChainId, isWrongNetwork } = useActiveChain();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-xl text-white shadow-lg shadow-emerald-950">
            🌿
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-white md:text-lg">
              MyHomeLab
            </span>
            <span className="hidden text-[11px] text-slate-400 sm:block">
              Hệ sinh thái Du lịch số Tuần hoàn & Tái tạo
            </span>
          </span>
        </Link>

        <nav aria-label="Điều hướng chính" className="order-last grid w-full grid-cols-3 gap-1 sm:flex md:order-none md:w-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-xl px-1.5 py-2 text-center text-xs font-medium transition-colors sm:flex-1 sm:px-3 sm:text-sm md:flex-none ${
                isActive(link.href)
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 text-xs lg:flex">
            <span
              className={`h-2 w-2 rounded-full ${isConnected ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`}
            />
            <span className={isWrongNetwork ? "text-amber-300" : "text-slate-300"}>
              {isWrongNetwork
                ? `Mạng chưa hỗ trợ (${getChainName(walletChainId ?? 0)})`
                : getChainName(chainId)}
            </span>
          </div>
          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}
