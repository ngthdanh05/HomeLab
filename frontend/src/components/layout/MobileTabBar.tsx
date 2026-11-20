"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { cn } from "@/components/ui";
import { useI18n } from "@/providers/LocaleProvider";
import { Dropdown, DropdownLink } from "./Dropdown";
import { isNavItemActive, matchesPath, NAV_ITEMS } from "./navigation";

const TAB =
  "flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary";
const tabState = (active: boolean) => (active ? "text-primary" : "text-text-muted hover:text-text");

/** Thanh tab đáy cho màn hình < lg: 4 mục chính + Của tôi, mỗi ô cao ≥ 56px. */
export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const meActive = matchesPath(pathname, "/dashboard");

  return (
    <nav
      aria-label={t("Điều hướng chính", "Main navigation")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const label = t<string>(item.shortLabel, item.shortLabelEn);
          const icon = (
            <>
              <item.Icon aria-hidden className="h-5 w-5" />
              <span className="line-clamp-1 max-w-full">{label}</span>
            </>
          );
          // Tên đầy đủ cho trình đọc màn hình, nhãn ngắn để hiển thị.
          return (
            <li key={item.href} className="relative" title={t<string>(item.label, item.labelEn)}>
              {item.children ? (
                <Dropdown
                  className="h-full"
                  placement="top"
                  align="end"
                  triggerClassName={cn(TAB, tabState(active))}
                  trigger={() => icon}
                  panelClassName="-right-16 sm:right-0"
                >
                  {(close) =>
                    item.children!.map((child) => (
                      <DropdownLink
                        key={child.href}
                        href={child.href}
                        icon={child.Icon}
                        label={t<string>(child.label, child.labelEn)}
                        hint={child.hint && t<string>(child.hint, child.hintEn ?? child.hint)}
                        active={matchesPath(pathname, child.href)}
                        onNavigate={close}
                      />
                    ))
                  }
                </Dropdown>
              ) : (
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn(TAB, tabState(active))}>
                  {icon}
                </Link>
              )}
            </li>
          );
        })}
        <li>
          <Link href="/dashboard" aria-current={meActive ? "page" : undefined} className={cn(TAB, tabState(meActive))}>
            <UserRound aria-hidden className="h-5 w-5" />
            <span className="line-clamp-1">{t("Của tôi", "My Page")}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
