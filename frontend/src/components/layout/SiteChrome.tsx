"use client";

import React from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useSwitchChain } from "wagmi";
import { Button } from "@/components/ui";
import { DEFAULT_CHAIN_ID, getChainName } from "@/config/contracts";
import { useActiveChain } from "@/hooks/useActiveChain";
import { siteName } from "@/lib/seo";
import { useI18n } from "@/providers/LocaleProvider";

/** Banner testnet: luôn một dòng (bản ngắn trên mobile), kèm link "Tìm hiểu thêm". */
export function TestnetBanner() {
  const { t } = useI18n();
  return (
    <p role="note" className="flex items-center justify-center gap-2 bg-warning-soft px-4 py-2 text-xs text-warning">
      <TriangleAlert aria-hidden className="h-4 w-4 shrink-0" />
      <span className="truncate">
        <span className="sm:hidden">{t("Bản thử nghiệm, không có giá trị thực.", "Testnet preview, no real value.")}</span>
        <span className="hidden sm:inline">
          {t(
            "Bản thử nghiệm trên mạng thử nghiệm: tài sản không có giá trị thực, hợp đồng tự động chưa được kiểm toán.",
            "Testnet preview: assets have no real value and the smart contracts have not been audited.",
          )}
        </span>
      </span>
      <Link href="/getting-started" className="shrink-0 font-semibold underline underline-offset-2 hover:text-text">
        {t("Tìm hiểu thêm", "Learn more")}
      </Link>
    </p>
  );
}

/** Cảnh báo sai mạng toàn cục (thay cho cảnh báo riêng ở từng trang). */
export function NetworkBanner() {
  const { t } = useI18n();
  const { walletChainId, isWrongNetwork } = useActiveChain();
  const { switchChain, isPending } = useSwitchChain();
  if (!isWrongNetwork) return null;

  const target = getChainName(DEFAULT_CHAIN_ID);
  return (
    <div role="alert" className="border-b border-warning/30 bg-warning-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm text-text sm:px-6 lg:px-8">
        <p className="flex items-start gap-2">
          <TriangleAlert aria-hidden className="mt-px h-5 w-5 shrink-0 text-warning" />
          <span>
            {t(
              `Ví đang ở mạng chưa hỗ trợ (${getChainName(walletChainId ?? 0)}). Dữ liệu đang được đọc từ ${target}; hãy chuyển ví sang ${target} trước khi giao dịch.`,
              `Your wallet is on an unsupported network (${getChainName(walletChainId ?? 0)}). Data is read from ${target}; switch your wallet to ${target} before making a transaction.`,
            )}
          </span>
        </p>
        <Button size="md" variant="secondary" loading={isPending} onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}>
          {t(`Chuyển sang ${target}`, `Switch to ${target}`)}
        </Button>
      </div>
    </div>
  );
}

const FOOTER_LINKS = [
  { href: "/getting-started", label: "Bắt đầu với ví", labelEn: "Wallet guide" },
  { href: "/transparency", label: "Minh bạch on-chain", labelEn: "On-chain transparency" },
  { href: "/terms", label: "Điều khoản sử dụng", labelEn: "Terms of Use" },
  { href: "/privacy", label: "Chính sách riêng tư", labelEn: "Privacy Policy" },
] as const;

export function SiteFooter() {
  const { locale, t } = useI18n();
  return (
    // pb lớn dưới lg để nội dung không bị thanh tab đáy che.
    <footer className="border-t border-border px-4 pb-24 pt-5 text-center text-xs text-text-muted lg:pb-5">
      <p className="mb-2">© 2026 {siteName(locale)}</p>
      <ul className="flex flex-wrap items-center justify-center gap-x-4">
        {FOOTER_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-11 items-center hover:text-primary">
              {t<string>(link.label, link.labelEn)}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
