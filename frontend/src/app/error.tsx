"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("[app] render error", error);
  }, [error]);

  return (
    <main id="main" className="w-full flex-1 mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <TriangleAlert aria-hidden className="h-12 w-12 text-danger" />
      <h1 className="text-2xl font-bold text-text">{t("Đã xảy ra lỗi", "Something went wrong")}</h1>
      <p className="text-sm text-text-muted">
        {t(
          "Trang này chưa tải được. Tiền và giao dịch của bạn không bị ảnh hưởng.",
          "This page could not be loaded. Your funds and on-chain transactions are not affected.",
        )}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          {t("Thử lại", "Try again")}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-text hover:bg-primary-soft">
          {t("Về trang chủ", "Back to home")}
        </Link>
      </div>
    </main>
  );
}
