"use client";

import React, { useId } from "react";
import { cn } from "./cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  className?: string;
}

/** Công tắc bật/tắt (role="switch") có nhãn bấm được; vùng chạm cao 44px. */
export function Switch({ checked, onChange, label, className }: SwitchProps) {
  const id = useId();
  return (
    <span className={cn("inline-flex min-h-11 items-center gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          checked ? "border-primary bg-primary" : "border-border-strong bg-border",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-surface shadow-overlay transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-text">
        {label}
      </label>
    </span>
  );
}
