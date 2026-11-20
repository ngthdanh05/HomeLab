"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main id="main" className="w-full flex-1 mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <Compass aria-hidden className="h-12 w-12 text-primary" />
      <h1 className="text-2xl font-bold text-text">{t("Không tìm thấy trang", "Page not found")}</h1>
      <p className="text-sm text-text-muted">
        {t("Đường dẫn này không tồn tại hoặc đã được chuyển đi.", "This link does not exist or has been moved.")}
      </p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
        {t("Về trang chủ", "Back to home")}
      </Link>
    </main>
  );
}
