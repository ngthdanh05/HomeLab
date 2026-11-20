"use client";

import React, { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useActiveChain } from "@/hooks/useActiveChain";
import { shortenAddress } from "@/lib/marketplace";
import { useI18n } from "@/providers/LocaleProvider";
import { cn } from "./cn";

export interface AddressProps {
  /** Địa chỉ ví/contract hoặc mã giao dịch. */
  value: string;
  /** `address` (mặc định) hoặc `tx` — quyết định đường dẫn Etherscan. */
  kind?: "address" | "tx";
  /** Số ký tự giữ lại ở mỗi đầu. */
  chars?: number;
  copyable?: boolean;
  /** Link tới trình duyệt khối (không có trên Anvil). */
  explorer?: boolean;
  className?: string;
}

// Nút icon nhỏ nhưng vùng bấm 48px nhờ lớp ::before tràn ra ngoài.
const ICON_BUTTON =
  "relative inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-muted transition-colors " +
  "hover:bg-primary-soft hover:text-primary before:absolute before:-inset-2 before:content-['']";

/** Địa chỉ ví / mã giao dịch: rút gọn, chữ mono, nút sao chép và link Etherscan. */
export function Address({ value, kind = "address", chars = 4, copyable = true, explorer = true, className }: AddressProps) {
  const { t } = useI18n();
  const { explorerUrl } = useActiveChain();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Trình duyệt chặn clipboard (không phải HTTPS…): người dùng vẫn chọn được chữ trong title.
    }
  };

  const href = explorer && explorerUrl ? `${explorerUrl}/${kind}/${value}` : undefined;
  const noun = kind === "tx" ? t("mã giao dịch", "transaction hash") : t("địa chỉ", "address");

  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      <span className="font-mono text-sm text-text" title={value}>
        {shortenAddress(value, chars)}
      </span>
      {copyable && (
        <button type="button" onClick={copy} className={ICON_BUTTON} aria-label={t(`Sao chép ${noun}`, `Copy ${noun}`)}>
          {copied ? <Check aria-hidden className="h-4 w-4 text-primary" /> : <Copy aria-hidden className="h-4 w-4" />}
        </button>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={ICON_BUTTON}
          aria-label={t(`Xem ${noun} trên Etherscan`, `View ${noun} on Etherscan`)}
        >
          <ExternalLink aria-hidden className="h-4 w-4" />
        </a>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? t("Đã sao chép", "Copied") : ""}
      </span>
    </span>
  );
}
