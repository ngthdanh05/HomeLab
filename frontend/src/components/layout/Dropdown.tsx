"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui";

export interface DropdownProps {
  /** Nội dung nút mở (nhãn, icon, mũi tên ▾). */
  trigger: (open: boolean) => React.ReactNode;
  triggerClassName?: string;
  /** Tên truy cập của nút khi nội dung nút không đủ rõ. */
  triggerLabel?: string;
  /** Căn panel theo mép trái hoặc phải của nút. */
  align?: "start" | "end";
  /** Mở lên trên (dùng ở thanh tab đáy). */
  placement?: "bottom" | "top";
  panelClassName?: string;
  /** Class của phần tử bao ngoài (ví dụ `h-full` trong thanh tab). */
  className?: string;
  children: (close: () => void) => React.ReactNode;
}

/**
 * Menu thả xuống theo mẫu disclosure (nút aria-expanded + danh sách link):
 * đóng khi bấm ra ngoài, nhấn Esc (trả focus về nút) hoặc khi chuyển trang.
 */
export function Dropdown({
  trigger,
  triggerClassName,
  triggerLabel,
  align = "start",
  placement = "bottom",
  panelClassName,
  className,
  children,
}: DropdownProps) {
  // Lưu pathname lúc mở: chuyển trang (kể cả bằng nút Back) thì `open` tự thành false.
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = useCallback((next: boolean) => setOpenedAt(next ? pathname : null), [pathname]);
  const close = useCallback(() => setOpenedAt(null), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, setOpen]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        onClick={() => setOpen(!open)}
        className={triggerClassName}
      >
        {trigger(open)}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute z-40 min-w-64 rounded-md border border-border bg-surface p-2 text-text shadow-overlay",
          placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2",
          align === "end" ? "right-0" : "left-0",
          panelClassName,
        )}
      >
        {open && children(close)}
      </div>
    </div>
  );
}

/** Một dòng link trong menu: icon, nhãn, mô tả phụ; vùng bấm ≥ 44px. */
export function DropdownLink({
  href,
  icon: Icon,
  label,
  hint,
  active,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: React.ReactNode;
  hint?: React.ReactNode;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-sm px-3 py-2 text-sm transition-colors hover:bg-primary-soft",
        active && "bg-primary-soft",
      )}
    >
      <Icon aria-hidden className="mt-px h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0">
        <span className={cn("block font-medium", active ? "text-primary" : "text-text")}>{label}</span>
        {hint && <span className="block text-xs text-text-muted">{hint}</span>}
      </span>
    </Link>
  );
}
