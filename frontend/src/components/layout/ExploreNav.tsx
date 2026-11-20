"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";
import { EXPLORE_LINKS, matchesPath } from "./navigation";

/** Điều hướng phụ giữa các trang thuộc "Khám phá" (mỗi trang một URL riêng, chia sẻ được). */
export function ExploreNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <nav aria-label={t("Khám phá", "Explore")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2">
        {EXPLORE_LINKS.map(({ href, label, labelEn, Icon }) => {
          const active = matchesPath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-text-muted hover:border-primary hover:text-text",
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
                {t<string>(label, labelEn)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
