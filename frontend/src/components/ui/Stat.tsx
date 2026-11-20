import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface StatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Dòng phụ dưới giá trị (đơn vị, so sánh…). */
  hint?: React.ReactNode;
  icon?: LucideIcon;
  /** `accent` cho số liệu phần thưởng (ECO, huy hiệu). */
  tone?: "default" | "primary" | "accent";
  className?: string;
}

const ICON_TONES = {
  default: "bg-bg text-text-muted",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent-strong",
} as const;

/** Một số liệu: nhãn, giá trị (tabular-nums), chú thích. Dùng `<dl>` ở ngoài khi có nhiều Stat. */
export function Stat({ label, value, hint, icon: Icon, tone = "default", className }: StatProps) {
  return (
    <div className={cn("flex items-start gap-3 rounded-md border border-border bg-surface p-4", className)}>
      {Icon && (
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-sm", ICON_TONES[tone])}>
          <Icon aria-hidden className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <dt className="text-sm text-text-muted">{label}</dt>
        <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">{value}</dd>
        {hint && <dd className="mt-1 text-xs font-medium text-text-muted">{hint}</dd>}
      </div>
    </div>
  );
}

/** Lưới Stat có ngữ nghĩa danh sách mô tả. */
export function StatGroup({ className, children, ...rest }: React.HTMLAttributes<HTMLDListElement>) {
  return (
    <dl className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} {...rest}>
      {children}
    </dl>
  );
}
