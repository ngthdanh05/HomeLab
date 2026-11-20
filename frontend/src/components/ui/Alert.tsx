import React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "./cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, { box: string; icon: LucideIcon; iconColor: string }> = {
  info: { box: "border-info/30 bg-info-soft", icon: Info, iconColor: "text-info" },
  success: { box: "border-primary/30 bg-primary-soft", icon: CheckCircle2, iconColor: "text-primary" },
  warning: { box: "border-warning/30 bg-warning-soft", icon: AlertTriangle, iconColor: "text-warning" },
  danger: { box: "border-danger/30 bg-danger-soft", icon: XCircle, iconColor: "text-danger" },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Hành động kèm theo, ví dụ nút "Thử lại". */
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  /** Mặc định: `alert` cho danger, `status` cho loại khác. Truyền `null` để không gắn role. */
  role?: "alert" | "status" | null;
}

/** Khung thông báo thống nhất cho lỗi, cảnh báo, thông tin và thành công. */
export function Alert({ tone = "info", title, children, action, icon, className, role }: AlertProps) {
  const style = TONES[tone];
  const Icon = icon ?? style.icon;
  const resolvedRole = role === null ? undefined : (role ?? (tone === "danger" ? "alert" : "status"));
  return (
    <div role={resolvedRole} className={cn("flex gap-3 rounded-md border p-4 text-sm text-text", style.box, className)}>
      <Icon aria-hidden className={cn("mt-px h-5 w-5 shrink-0", style.iconColor)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("break-words", Boolean(title) && "mt-1")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
