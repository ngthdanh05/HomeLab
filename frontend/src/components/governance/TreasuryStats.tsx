"use client";

import React from "react";
import { BookOpenText } from "lucide-react";
import { Address } from "@/components/ui";
import { formatTokenAmount } from "@/lib/dashboard";
import { formatBpsPercent, formatDuration } from "@/lib/governance";
import type { Locale } from "@/lib/i18n";
import { useI18n } from "@/providers/LocaleProvider";

function formatEth(value: bigint | undefined, locale: Locale = "vi"): string {
  if (value === undefined) return "—";
  return `${formatTokenAmount(value, 18, 6, locale)} ETH`;
}

interface TreasuryStatsProps {
  balance: bigint | undefined;
  totalDisbursed: bigint | undefined;
  disbursementCount: number | undefined;
  activeCount: number | undefined;
  totalProposals: bigint | undefined;
}

/** Ba con số chính của Quỹ trên một hàng (kể cả trên mobile), một màu. */
export function TreasuryStats({ balance, totalDisbursed, disbursementCount, activeCount, totalProposals }: TreasuryStatsProps) {
  const { locale, t } = useI18n();
  const items = [
    { label: t("Quỹ đang có", "In the Fund"), value: formatEth(balance, locale), hint: t("20% mỗi đơn + phí bù carbon", "20% of orders + offset fees") },
    {
      label: t("Đã giải ngân", "Disbursed"),
      value: formatEth(totalDisbursed, locale),
      hint: disbursementCount !== undefined ? t(`${disbursementCount} lần giải ngân`, `${disbursementCount} disbursement${disbursementCount === 1 ? "" : "s"}`) : undefined,
    },
    {
      label: t("Đang bỏ phiếu", "In voting"),
      value: activeCount === undefined ? "—" : String(activeCount),
      hint: totalProposals !== undefined ? t(`Tổng ${totalProposals} đề xuất`, `${totalProposals} proposal${totalProposals === 1n ? "" : "s"} in total`) : undefined,
    },
  ];

  return (
    <section aria-label={t("Thống kê Quỹ bảo tồn biển", "Ocean Conservation Fund statistics")}>
      <dl className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 p-3 sm:p-6">
            <dt className="text-xs font-medium text-text-muted sm:text-sm">{item.label}</dt>
            <dd className="mt-1 break-words text-base font-semibold tabular-nums text-text sm:text-2xl" aria-live="polite">
              {item.value}
            </dd>
            {item.hint && <dd className="mt-1 hidden text-xs font-medium text-text-muted sm:block">{item.hint}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Thông số DAO giải thích bằng lời, thu gọn trong mục mở rộng. */
export function VotingRules({
  proposalThreshold,
  quorumBps,
  votingPeriod,
  treasuryAddress,
}: {
  proposalThreshold: bigint | undefined;
  quorumBps: bigint | undefined;
  votingPeriod: bigint | undefined;
  treasuryAddress: string;
}) {
  const { locale, t } = useI18n();
  const threshold = proposalThreshold !== undefined ? `${formatTokenAmount(proposalThreshold, 18, 4, locale)} ECO` : "—";
  const quorum = quorumBps !== undefined ? formatBpsPercent(quorumBps, locale) : "—";
  const period = votingPeriod !== undefined ? formatDuration(Number(votingPeriod), locale) : "—";

  return (
    <details className="rounded-md border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-semibold text-text">
        <BookOpenText aria-hidden className="h-4 w-4 text-primary" />
        {t("Quy tắc bỏ phiếu", "Voting rules")}
      </summary>
      <ul className="list-disc space-y-2 px-4 pb-4 pl-9 text-sm text-text-muted">
        <li>{t(`Cần có ${threshold} để tạo một đề xuất.`, `You need ${threshold} to create a proposal.`)}</li>
        <li>{t(`Mỗi đề xuất mở bỏ phiếu trong ${period}.`, `Each proposal is open for voting for ${period}.`)}</li>
        <li>
          {t(
            `Số phiếu tối thiểu: tổng phiếu (cả đồng ý và phản đối) phải đạt ${quorum} tổng số ECO đang lưu hành, nếu không đề xuất không có hiệu lực.`,
            `Quorum: all votes cast (for and against) must reach ${quorum} of the ECO in circulation, otherwise the proposal does not count.`,
          )}
        </li>
        <li>
          {t(
            "Đồng ý nhiều hơn phản đối thì Quỹ tự động giải ngân sau thời gian chờ an toàn; hoà phiếu là không thông qua.",
            "If more votes are for than against, the Fund pays out automatically after a safety delay; a tie means it does not pass.",
          )}
        </li>
        <li>
          {t(
            "Phiếu của bạn tính theo số ECO tại thời điểm đề xuất được tạo, nên hãy kích hoạt quyền bỏ phiếu sớm.",
            "Your vote counts the ECO you held when the proposal was created, so activate your voting power early.",
          )}
        </li>
        <li className="flex flex-wrap items-center gap-2">
          {t("Hợp đồng tự động của Quỹ:", "Fund smart contract:")} <Address value={treasuryAddress} />
        </li>
      </ul>
    </details>
  );
}

export { formatEth };
