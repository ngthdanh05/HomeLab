import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface PageHeaderProps {
  title: React.ReactNode;
  /** Dòng nhỏ phía trên tiêu đề (tên mục). */
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Hành động của trang (tối đa một nút primary). */
  actions?: React.ReactNode;
  className?: string;
}

/** Đầu trang thống nhất: một H1, mô tả ngắn, hành động bên phải. */
export function PageHeader({ title, eyebrow, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow && (
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            {Icon && <Icon aria-hidden className="h-4 w-4" />}
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold leading-tight text-text sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 text-base text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
