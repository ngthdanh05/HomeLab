"use client";

import React, { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: LucideIcon;
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Tên của nhóm tab cho trình đọc màn hình. */
  label: string;
  /** Tiền tố id; panel dùng `tabPanelProps(idPrefix, id)`. */
  idPrefix: string;
  className?: string;
}

export const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const tabPanelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** Thuộc tính cho panel tương ứng với một tab. */
export function tabPanelProps(prefix: string, id: string) {
  return { id: tabPanelId(prefix, id), role: "tabpanel" as const, "aria-labelledby": tabId(prefix, id), tabIndex: 0 };
}

/**
 * Tab theo mẫu WAI-ARIA: phím ← → Home End di chuyển và chọn tab (roving tabindex).
 * Dùng cho nội dung cùng trang; lọc danh sách thì dùng `FilterChips`.
 */
export function Tabs<T extends string>({ items, value, onChange, label, idPrefix, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (index: number) => {
    const item = items[(index + items.length) % items.length];
    onChange(item.id);
    refs.current[(index + items.length) % items.length]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  };

  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-border", className)}>
      {items.map((item, index) => {
        const selected = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
              selected ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {Icon && <Icon aria-hidden className="h-4 w-4" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
