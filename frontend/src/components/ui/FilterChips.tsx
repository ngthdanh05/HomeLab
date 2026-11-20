"use client";

import React from "react";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface FilterChipItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  /** Số lượng hiển thị cạnh nhãn. */
  count?: number;
}

export interface FilterChipsProps<T extends string> {
  items: readonly FilterChipItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Tên của nhóm lọc cho trình đọc màn hình. */
  label: string;
  className?: string;
}

/** Bộ lọc một lựa chọn cho danh sách (Chợ làng chài, Quỹ bảo tồn biển, Di sản…). Vùng bấm cao 44px. */
export function FilterChips<T extends string>({ items, value, onChange, label, className }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const selected = item.id === value;
        const Icon = selected ? Check : item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
            )}
          >
            {Icon && <Icon aria-hidden className="h-4 w-4" />}
            {item.label}
            {item.count !== undefined && <span className="tabular-nums text-xs">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
