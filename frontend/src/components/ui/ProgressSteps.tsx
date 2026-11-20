import React from "react";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "./cn";

export type StepState = "done" | "current" | "upcoming" | "warning";

export interface ProgressStep {
  key: string;
  label: React.ReactNode;
  /** Dòng phụ dưới nhãn (hạn, người thực hiện…). */
  hint?: React.ReactNode;
  state: StepState;
}

const DOT: Record<StepState, string> = {
  done: "border-primary bg-primary text-white",
  current: "border-primary bg-surface text-primary",
  upcoming: "border-border-strong bg-surface text-text-muted",
  warning: "border-warning bg-warning-soft text-warning",
};

const LINE: Record<StepState, string> = {
  done: "bg-primary",
  current: "bg-border",
  upcoming: "bg-border",
  warning: "bg-warning/40",
};

/**
 * Dòng tiến trình ngang (dọc trên màn hẹp): Đã thanh toán → Đã nhận hàng → Hoàn tất.
 * Bước hiện tại có `aria-current="step"`; trạng thái được đọc cho trình đọc màn hình.
 */
export function ProgressSteps({
  steps,
  label,
  stateLabels,
  className,
}: {
  steps: readonly ProgressStep[];
  /** Tên dòng tiến trình cho trình đọc màn hình. */
  label: string;
  /** Chữ cho trình đọc màn hình theo trạng thái ("đã xong", "đang chờ"…). */
  stateLabels: Record<StepState, string>;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("flex flex-col gap-3 sm:flex-row sm:gap-0", className)}>
      {steps.map((step, i) => (
        <li
          key={step.key}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
        >
          {i > 0 && (
            <span
              aria-hidden
              className={cn("absolute right-1/2 top-4 hidden h-1 w-full -translate-y-1/2 sm:block", LINE[steps[i - 1].state])}
            />
          )}
          <span
            aria-hidden
            className={cn(
              "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums",
              DOT[step.state],
            )}
          >
            {step.state === "done" ? (
              <Check className="h-4 w-4" />
            ) : step.state === "warning" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </span>
          <span className="min-w-0 pt-1 sm:px-2 sm:pt-0">
            <span className={cn("block text-sm font-medium", step.state === "upcoming" ? "text-text-muted" : "text-text")}>
              {step.label}
              <span className="sr-only">: {stateLabels[step.state]}</span>
            </span>
            {step.hint && <span className="mt-1 block text-xs font-medium text-text-muted">{step.hint}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
