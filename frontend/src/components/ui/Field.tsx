"use client";

import React, { createContext, useContext, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
  label: React.ReactNode;
  /** Gợi ý dưới ô nhập. */
  hint?: React.ReactNode;
  /** Thông báo lỗi; có giá trị ⇒ ô nhập `aria-invalid`. */
  error?: React.ReactNode;
  required?: boolean;
  /** id cho ô nhập; mặc định tự sinh. */
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Bọc một ô nhập với nhãn, gợi ý và lỗi. `Input`/`Select`/`Textarea` bên trong tự nhận
 * `id`, `aria-describedby`, `aria-invalid`, `required`.
 */
export function Field({ label, hint, error, required = false, id, className, children }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? `field-${autoId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id: fieldId, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-2", className)}>
        <label htmlFor={fieldId} className="text-sm font-medium text-text">
          {label}
          {required && (
            <span aria-hidden className="text-danger">
              {" "}
              *
            </span>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-xs font-medium text-text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps<T extends { id?: string; "aria-describedby"?: string; "aria-invalid"?: React.AriaAttributes["aria-invalid"]; required?: boolean }>(
  props: T,
): T {
  const field = useContext(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": [field.describedBy, props["aria-describedby"]].filter(Boolean).join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    required: props.required ?? (field.required || undefined),
  };
}

// Cùng chiều cao 44px và viền border-strong (≥ 3:1) cho mọi ô nhập.
const CONTROL =
  "w-full rounded-sm border border-border-strong bg-surface text-base text-text placeholder:text-text-muted " +
  "transition-colors focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 " +
  "focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-bg disabled:text-text-muted " +
  "aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(CONTROL, "h-11 px-3", className)} {...useFieldProps(props)} />;
});

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cn(CONTROL, "min-h-24 px-3 py-2", className)} {...useFieldProps(props)} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(CONTROL, "h-11 appearance-none pl-3 pr-10", className)} {...useFieldProps(props)}>
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
    </div>
  );
});
