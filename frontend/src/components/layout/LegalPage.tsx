"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/providers/LocaleProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Shared layout of the legal pages; both are drafts until reviewed by counsel. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 text-sm leading-relaxed text-slate-300 sm:px-6 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="text-slate-400 hover:text-emerald-400">
          {t("← Về trang chủ", "← Back to home")}
        </Link>
        <LanguageSwitcher />
      </div>
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      <p role="note" className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-amber-200">
        {t(
          "Bản nháp cho giai đoạn thử nghiệm trên testnet. Nội dung chưa được luật sư rà soát và phải được hoàn thiện trước khi vận hành với tài sản thật.",
          "Draft for the testnet phase. This content has not been reviewed by a lawyer and must be finalized before operating with real assets.",
        )}
      </p>
      {children}
    </main>
  );
}
