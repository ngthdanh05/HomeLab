"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
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

const VARIANT_STYLES: Record<ToastVariant, { box: string; icon: string }> = {
  success: { box: "border-emerald-600/60 bg-emerald-950/95", icon: "✅" },
  error: { box: "border-red-600/60 bg-red-950/95", icon: "⚠️" },
  info: { box: "border-slate-600 bg-slate-900/95", icon: "⏳" },
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
        className="fixed z-50 bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2"
      >
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant ?? "info"];
          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              className={`animate-fade-in rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${style.box}`}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden>{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-slate-300 mt-0.5 break-words">{t.description}</p>
                  )}
                  {t.link && (
                    <a
                      href={t.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 underline"
                    >
                      {t.link.label} ↗
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label={translate("Đóng thông báo", "Close notification")}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
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
