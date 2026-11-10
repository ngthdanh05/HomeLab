"use client";

import React from "react";
import Link from "next/link";
import { useI18n } from "@/providers/LocaleProvider";

export function TestnetBanner() {
  const { t } = useI18n();
  return (
    <p role="note" className="bg-amber-900/60 px-4 py-1.5 text-center text-xs text-amber-100">
      {t(
        "⚠️ Bản thử nghiệm trên testnet: tài sản không có giá trị thực, smart contract chưa được kiểm toán.",
        "⚠️ Testnet preview: assets have no real value and the smart contracts have not been audited.",
      )}
    </p>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-400">
      <Link href="/terms" className="hover:text-emerald-400">
        {t("Điều khoản sử dụng", "Terms of Use")}
      </Link>
      <span aria-hidden> · </span>
      <Link href="/privacy" className="hover:text-emerald-400">
        {t("Chính sách riêng tư", "Privacy Policy")}
      </Link>
    </footer>
  );
}
