"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Shell } from "lucide-react";
import { cn } from "@/components/ui";
import { siteName } from "@/lib/seo";
import { useI18n } from "@/providers/LocaleProvider";
import { Dropdown, DropdownLink } from "./Dropdown";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { matchesPath, isNavItemActive, NAV_ITEMS } from "./navigation";
import { WalletMenu } from "./WalletMenu";

const NAV_LINK =
  "inline-flex h-11 items-center gap-1 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";
const navLinkState = (active: boolean) =>
  active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-primary-soft hover:text-text";

export function SiteLogo() {
  const { locale } = useI18n();
  const name = siteName(locale);
  return (
    <Link href="/" aria-label={name} className="flex shrink-0 items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
        <Shell aria-hidden className="h-5 w-5" />
      </span>
      <span className="text-base font-bold tracking-tight text-text">{name}</span>
    </Link>
  );
}

/**
 * Header một hàng, cao 64px: logo · 4 mục menu (≥ lg) · ngôn ngữ · menu ví.
 * Dưới lg, menu chuyển xuống thanh tab đáy (MobileTabBar).
 */
export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <SiteLogo />

        <nav aria-label={t("Điều hướng chính", "Main navigation")} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item);
              const label = t<string>(item.label, item.labelEn);
              if (!item.children) {
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(NAV_LINK, navLinkState(active))}
                    >
                      {label}
                    </Link>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Dropdown
                    triggerClassName={cn(NAV_LINK, navLinkState(active))}
                    trigger={(open) => (
                      <>
                        {label}
                        <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                      </>
                    )}
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
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}
