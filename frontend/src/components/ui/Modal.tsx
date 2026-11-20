"use client";

import React, { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";
import { cn } from "./cn";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("inert") && el.getClientRects().length > 0,
  );
}

const subscribeNoop = () => () => {};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Vùng nút ở chân modal. */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** false khi đang gửi giao dịch: chặn Esc, bấm nền và nút đóng. */
  dismissible?: boolean;
  /** Phần tử nhận focus khi mở; mặc định là phần tử focus được đầu tiên trong nội dung. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

/**
 * Hộp thoại modal: giữ focus bên trong (Tab / Shift+Tab xoay vòng), Esc để đóng,
 * khoá cuộn trang, trả focus về phần tử đã mở modal khi đóng.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  initialFocusRef,
  className,
}: ModalProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Portal chỉ render phía client (document.body không có khi SSR).
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // Giữ tham chiếu mới nhất mà không chạy lại effect focus mỗi lần render.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open || !mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    if (dialog) {
      const target =
        initialFocusRef?.current ?? focusableIn(dialog).find((el) => !el.dataset.modalClose) ?? dialog;
      target.focus();
    }

    return () => {
      document.body.style.overflow = overflow;
      // Trả focus khi phần tử cũ vẫn còn trong trang.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, mounted, initialFocusRef]);

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (dismissibleRef.current) onCloseRef.current();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = focusableIn(dialogRef.current);
    if (items.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-text/50 animate-fade-in"
        onClick={() => dismissible && onClose()}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-lg border border-border bg-surface text-text shadow-overlay",
          "animate-fade-in focus:outline-none sm:rounded-lg",
          SIZES[size],
          className,
        )}
      >
        <div className="flex items-start gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1 pt-2">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            data-modal-close="true"
            onClick={onClose}
            disabled={!dismissible}
            aria-label={t("Đóng", "Close")}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg hover:text-text disabled:opacity-40"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
