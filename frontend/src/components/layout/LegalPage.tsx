"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Shared layout of the legal pages; both are drafts until reviewed by counsel. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main id="main" className="w-full flex-1 mx-auto max-w-3xl space-y-5 px-4 py-10 text-sm leading-relaxed text-text-muted sm:px-6 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-text-muted hover:text-primary">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t("Về trang chủ", "Back to home")}
        </Link>
        <LanguageSwitcher />
      </div>
      <h1 className="text-3xl font-bold text-text">{title}</h1>
      <p role="note" className="rounded-md border border-warning/30 bg-warning-soft p-3 text-warning">
        {t(
          "Bản nháp cho giai đoạn thử nghiệm trên testnet. Nội dung chưa được luật sư rà soát và phải được hoàn thiện trước khi vận hành với tài sản thật.",
          "Draft for the testnet phase. This content has not been reviewed by a lawyer and must be finalized before operating with real assets.",
        )}
      </p>
      {children}
    </main>
  );
}
