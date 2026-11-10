"use client";

import Link from "next/link";
import { useI18n } from "@/providers/LocaleProvider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold text-white">{t("Không tìm thấy trang", "Page not found")}</h1>
      <p className="text-sm text-slate-400">
        {t("Đường dẫn này không tồn tại hoặc đã được chuyển đi.", "This link does not exist or has been moved.")}
      </p>
      <Link href="/" className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
        {t("Về trang chủ", "Back to home")}
      </Link>
    </main>
  );
}
