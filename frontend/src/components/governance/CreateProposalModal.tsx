"use client";

import React, { useId, useState } from "react";
import { useAccount } from "wagmi";
import { Alert, Button, Field, Input, Modal, Textarea, TxButton } from "@/components/ui";
import { GovernanceABI } from "@/config/contracts";
import { PROPOSAL_TEMPLATES, localizeTemplate, type ProposalTemplate } from "@/data/proposalTemplates";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useContractTx } from "@/hooks/useContractTx";
import { useVotingPower } from "@/hooks/useGovernance";
import { formatTokenAmount } from "@/lib/dashboard";
import {
  encodeProposalDescription,
  formatDuration,
  parseEthAmount,
  PROPOSAL_LIMITS,
  validateProposalForm,
  type ProposalForm,
} from "@/lib/governance";
import { useI18n } from "@/providers/LocaleProvider";
import { formatEth } from "./TreasuryStats";

interface CreateProposalModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  proposalThreshold: bigint | undefined;
  votingPeriod: bigint | undefined;
  treasuryBalance: bigint | undefined;
  /** Mẫu điền sẵn khi mở từ thẻ "Ý tưởng dự án". */
  template?: ProposalTemplate | null;
}

const EMPTY_FORM: ProposalForm = { title: "", body: "", amount: "", recipient: "" };

/** Form Governance.propose(): dự án bảo tồn biển, số ETH yêu cầu, ví nhận. */
export function CreateProposalModal({
  open,
  onClose,
  onCreated,
  proposalThreshold,
  votingPeriod,
  treasuryBalance,
  template,
}: CreateProposalModalProps) {
  const { locale, t } = useI18n();
  const formId = useId();
  const { addresses } = useActiveChain();
  const { address: user } = useAccount();
  const { balance } = useVotingPower(user);
  const { send, status, isBusy } = useContractTx({
    pending: t("Đang tạo đề xuất", "Creating proposal"),
    success: t("Tạo đề xuất thành công!", "Proposal created!"),
  });

  // Mở từ một mẫu: điền tên, mô tả, số ETH (ví nhận để người đề xuất tự nhập).
  // Trang cha đổi `key` theo mẫu nên form được khởi tạo lại.
  const [form, setForm] = useState<ProposalForm>(() => (template ? { ...EMPTY_FORM, ...localizeTemplate(template, locale) } : EMPTY_FORM));
  const [error, setError] = useState<string | null>(null);

  const amount = parseEthAmount(form.amount);
  const belowThreshold = Boolean(user) && balance !== undefined && proposalThreshold !== undefined && balance < proposalThreshold;
  const exceedsTreasury = amount !== null && treasuryBalance !== undefined && amount > treasuryBalance;
  const set = (patch: Partial<ProposalForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const formError = validateProposalForm(form, locale);
    if (formError) return setError(formError);
    if (belowThreshold) {
      return setError(t("Số dư ECO chưa đạt ngưỡng tối thiểu để tạo đề xuất.", "Your ECO balance is below the minimum required to create a proposal."));
    }
    setError(null);
    const result = await send({
      address: addresses.governance,
      abi: GovernanceABI,
      functionName: "propose",
      args: [form.recipient.trim(), amount, encodeProposalDescription(form.title, form.body)],
    });
    // Đóng cả khi "unconfirmed": giao dịch đã gửi, gửi lại sẽ tạo trùng.
    if (result) {
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isBusy}
      title={t("Đề xuất dự án bảo tồn", "Propose a conservation project")}
      description={
        <>
          {t("Cộng đồng bỏ phiếu bằng ECO", "The community votes with ECO")}
          {votingPeriod !== undefined ? ` ${t("trong", "for")} ${formatDuration(Number(votingPeriod), locale)}` : ""}.{" "}
          {t("Nếu được thông qua, Quỹ bảo tồn biển tự động giải ngân ETH cho ví nhận.", "If it passes, the Ocean Conservation Fund disburses ETH to the recipient wallet automatically.")}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {t("Huỷ", "Cancel")}
          </Button>
          <TxButton status={status} disabled={belowThreshold} onClick={submit}>
            {t("Gửi đề xuất", "Submit proposal")}
          </TxButton>
        </>
      }
    >
      {belowThreshold && (
        <Alert tone="warning" role="alert" className="mb-4">
          {t("Cần tối thiểu", "You need at least")} <strong>{formatTokenAmount(proposalThreshold ?? 0n, 18, 4, locale)} ECO</strong>{" "}
          {t("để tạo đề xuất; ví của bạn có", "to create a proposal; your wallet has")} {formatTokenAmount(balance ?? 0n, 18, 2, locale)} ECO.
        </Alert>
      )}

      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          if (!isBusy) void submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-text">{t("Bắt đầu từ mẫu", "Start from an example")}</p>
          <div className="flex flex-wrap gap-2">
            {PROPOSAL_TEMPLATES.map((tpl) => {
              const filled = localizeTemplate(tpl, locale);
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => set({ title: filled.title, body: filled.body, amount: filled.amount })}
                  className="min-h-11 rounded-sm border border-border bg-surface px-3 text-left text-sm text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {filled.title}
                </button>
              );
            })}
          </div>
        </div>

        <Field label={t("Tên dự án", "Project name")} required>
          <Input
            value={form.title}
            maxLength={PROPOSAL_LIMITS.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={t("VD: Tài trợ phao neo bảo vệ rạn san hô", "E.g. Mooring buoys to protect the coral reef")}
          />
        </Field>

        <Field
          label={t("Mô tả", "Description")}
          required
          hint={`${t("Mục tiêu, kế hoạch dùng quỹ, ai thực hiện", "Goals, how the funds are used, who does it")} · ${form.body.length}/${PROPOSAL_LIMITS.body}`}
        >
          <Textarea
            rows={4}
            value={form.body}
            maxLength={PROPOSAL_LIMITS.body}
            onChange={(e) => set({ body: e.target.value })}
            placeholder={t("Thu gom lưới ma trên rạn cùng 12 thợ lặn địa phương…", "Remove ghost nets from the reef with 12 local divers…")}
          />
        </Field>

        <Field
          label={t("Số ETH yêu cầu", "ETH requested")}
          required
          hint={
            treasuryBalance !== undefined ? (
              <span className={exceedsTreasury ? "text-warning" : undefined}>
                {t("Quỹ hiện có", "The Fund currently holds")} {formatEth(treasuryBalance, locale)}
                {exceedsTreasury &&
                  t(
                    " — số yêu cầu lớn hơn số dư, đề xuất chỉ giải ngân được khi Quỹ đủ tiền.",
                    ". The amount exceeds the balance, so it can only be disbursed once the Fund has enough.",
                  )}
              </span>
            ) : undefined
          }
        >
          <Input className="tabular-nums" inputMode="decimal" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="0.05" />
        </Field>

        <Field label={t("Địa chỉ ví nhận", "Recipient wallet address")} required hint={t("Ví của nhóm thực hiện dự án.", "The wallet of the team carrying out the project.")}>
          <Input
            className="font-mono"
            value={form.recipient}
            onChange={(e) => set({ recipient: e.target.value })}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
          />
        </Field>
        {user && (
          <Button variant="ghost" onClick={() => set({ recipient: user })} className="-mt-2">
            {t("Dùng ví của tôi", "Use my wallet")}
          </Button>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Modal>
  );
}
