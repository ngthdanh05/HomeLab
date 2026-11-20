import React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export interface EmptyStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Việc tiếp theo người dùng có thể làm (luôn nên có). */
  action?: React.ReactNode;
  className?: string;
}

/** Trạng thái trống: giải thích vì sao trống và gợi ý việc tiếp theo. */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon aria-hidden className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-semibold text-text">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
