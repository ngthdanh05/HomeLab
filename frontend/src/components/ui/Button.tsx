import React from "react";
import Link from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors select-none " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-border disabled:text-text-muted " +
    "aria-disabled:bg-border aria-disabled:text-text-muted",
  secondary:
    "border border-border-strong bg-surface text-text hover:bg-primary-soft hover:border-primary " +
    "disabled:border-border disabled:bg-bg disabled:text-text-muted",
  ghost: "text-primary hover:bg-primary-soft disabled:text-text-muted disabled:hover:bg-transparent",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-border disabled:text-text-muted",
};

// Chiều cao tối thiểu 44px (md) / 48px (lg) cho vùng chạm.
const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 py-2 text-sm",
  lg: "min-h-12 px-6 py-3 text-base",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** Class của nút, dùng khi cần style nút cho phần tử khác (ví dụ `<a>`). */
export function buttonClasses({ variant = "primary", size = "md", fullWidth, className }: ButtonStyleOptions = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("h-4 w-4 shrink-0 animate-spin", className)} />;
}

interface ContentProps {
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  children?: React.ReactNode;
}

function ButtonContent({ icon: Icon, iconRight: IconRight, loading, children }: ContentProps) {
  return (
    <>
      {loading ? <Spinner /> : Icon && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
      {children}
      {IconRight && !loading && <IconRight aria-hidden className="h-4 w-4 shrink-0" />}
    </>
  );
}

export interface ButtonProps
  extends ButtonStyleOptions,
    Omit<ContentProps, "children">,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, className, icon, iconRight, loading = false, disabled, type = "button", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      <ButtonContent icon={icon} iconRight={iconRight} loading={loading}>
        {children}
      </ButtonContent>
    </button>
  );
});

export interface ButtonLinkProps
  extends ButtonStyleOptions,
    Omit<ContentProps, "loading">,
    Omit<React.ComponentProps<typeof Link>, "className"> {}

/** Link điều hướng trông như nút (dùng `next/link`). */
export function ButtonLink({ variant, size, fullWidth, className, icon, iconRight, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <ButtonContent icon={icon} iconRight={iconRight}>
        {children}
      </ButtonContent>
    </Link>
  );
}
