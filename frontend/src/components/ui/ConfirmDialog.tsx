"use client";

import React from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";
import type { TxStatus } from "@/hooks/useContractTx";
import { useI18n } from "@/providers/LocaleProvider";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { TxButton } from "./TxButton";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Hậu quả của hành động, mỗi dòng một ý (hiện dạng danh sách). */
  consequences: React.ReactNode[];
  confirmLabel: string;
  /** `danger` cho hoàn tiền / khiếu nại; `primary` cho giải ngân. */
  tone?: "primary" | "danger";
  /** Trạng thái giao dịch: khi bận, hộp thoại không đóng được. */
  status: TxStatus;
  onConfirm: () => void | Promise<unknown>;
  icon?: LucideIcon;
}

const BUSY: TxStatus[] = ["awaiting-wallet", "pending"];

/**
 * Bước xác nhận cho hành động **không đảo ngược** (giải ngân, khiếu nại, hoàn tiền):
 * nêu rõ hậu quả trước khi gửi giao dịch. Nút xác nhận là `TxButton` nên tự xử lý ví.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  consequences,
  confirmLabel,
  tone = "primary",
  status,
  onConfirm,
  icon: Icon = AlertTriangle,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const busy = BUSY.includes(status);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("Quay lại", "Go back")}
          </Button>
          <TxButton variant={tone} status={status} onClick={onConfirm}>
            {confirmLabel}
          </TxButton>
        </>
      }
    >
      <div className="flex gap-3">
        <Icon aria-hidden className={tone === "danger" ? "mt-px h-5 w-5 shrink-0 text-danger" : "mt-px h-5 w-5 shrink-0 text-warning"} />
        <div className="space-y-2 text-sm text-text">
          <p className="font-semibold">{t("Bạn không thể hoàn tác bước này:", "This step cannot be undone:")}</p>
          <ul className="list-disc space-y-1 pl-5 text-text-muted">
            {consequences.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
