import React from "react";
import { cn } from "./cn";

type CardElement = "div" | "section" | "article" | "aside" | "li";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: CardElement;
  /** `lg` (mặc định): thẻ lớn bo 20px · `sm`: thẻ nhỏ bo 12px. */
  size?: "sm" | "lg";
  /** Đệm trong: none · sm 16px · md 24px (mặc định). */
  padding?: "none" | "sm" | "md";
  /** Thẻ bấm được: thêm hiệu ứng hover viền. */
  interactive?: boolean;
}

const PADDING = { none: "", sm: "p-4", md: "p-6" } as const;

/** Thẻ trên nền sáng: chỉ dùng viền mảnh, không kèm bóng hay gradient. */
export function Card({ as: Tag = "div", size = "lg", padding = "md", interactive, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        "border border-border bg-surface text-text",
        size === "lg" ? "rounded-lg" : "rounded-md",
        PADDING[padding],
        interactive && "transition-colors hover:border-primary focus-within:border-primary",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ as: Tag = "h3", className, ...rest }: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }) {
  return <Tag className={cn("text-lg font-semibold text-text", className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-text-muted", className)} {...rest} />;
}
