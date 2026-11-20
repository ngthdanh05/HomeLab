"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, X, XCircle, type LucideIcon } from "lucide-react";
import { useI18n } from "@/providers/LocaleProvider";

type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  link?: { href: string; label: string };
  /** ms before auto-dismiss; 0 keeps the toast until closed. */
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
}

interface ToastContextValue {
  toast: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { box: string; icon: LucideIcon; iconColor: string }> = {
  success: { box: "border-primary/30", icon: CheckCircle2, iconColor: "text-primary" },
  error: { box: "border-danger/30", icon: XCircle, iconColor: "text-danger" },
  info: { box: "border-border", icon: Loader2, iconColor: "text-info animate-spin motion-reduce:animate-none" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t: translate } = useI18n();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { ...input, id }]);
      const duration = input.duration ?? 6000;
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed z-50 bottom-24 lg:bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant ?? "info"];
          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              className={`animate-fade-in rounded-md border bg-surface px-4 py-3 shadow-overlay ${style.box}`}
            >
              <div className="flex items-start gap-3">
                <style.icon aria-hidden className={`mt-px h-5 w-5 shrink-0 ${style.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 break-words text-sm text-text-muted">{t.description}</p>
                  )}
                  {t.link && (
                    <a
                      href={t.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-medium text-primary underline hover:text-primary-hover"
                    >
                      {t.link.label}
                      <ExternalLink aria-hidden className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label={translate("Đóng thông báo", "Close notification")}
                  className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-text"
                >
                  <X aria-hidden className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
