"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/providers/LocaleProvider";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("[app] render error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="text-2xl font-bold text-white">{t("Đã xảy ra lỗi", "Something went wrong")}</h1>
      <p className="text-sm text-slate-400">
        {t(
          "Trang này chưa tải được. Tiền và giao dịch on-chain của bạn không bị ảnh hưởng.",
          "This page could not be loaded. Your funds and on-chain transactions are not affected.",
        )}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          {t("Thử lại", "Try again")}
        </button>
        <Link href="/" className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700">
          {t("Về trang chủ", "Back to home")}
        </Link>
      </div>
    </main>
  );
}
