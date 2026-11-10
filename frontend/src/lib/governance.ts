// Framework-free helpers for the Community DAO (unit-tested with plain Node).
// Mirrors contracts/src/Governance.sol and CommunityTreasury.sol.

import { intlLocale, pick, type Locale } from "./i18n.ts";

/** Governance.Proposal as returned by `getProposal()` (viem decodes the struct to an object). */
export interface OnChainProposal {
  proposer: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  description: string;
  snapshotBlock: bigint;
  deadline: bigint;
  quorumVotes: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  finalized: boolean;
  /** Earliest time a passed proposal can be executed (deadline + timelock). */
  executeAfter: bigint;
  cancelled: boolean;
}

/** Governance.EXECUTION_GRACE_PERIOD (14 days). */
export const EXECUTION_GRACE_SECONDS = 14n * 86_400n;

/**
 * Lifecycle derived from on-chain fields (the contract only stores `finalized`):
 * - pending     — voting delay: holders can still delegate, votes open after the snapshot block
 * - active      — voting open (now < deadline)
 * - queued      — voting over, quorum met, For > Against; waiting for the timelock
 * - passed      — timelock over; anyone can execute → disbursement
 * - expired     — passed but not executed within the grace period
 * - cancelled   — cancelled by the guardian
 * - defeated    — voting over, quorum met, For ≤ Against; execute() records the rejection
 * - no-quorum   — voting over without quorum; execute() always reverts (QuorumNotReached)
 * - executed    — finalized with For > Against: Treasury has paid the recipient
 * - rejected    — finalized with For ≤ Against
 */
export type ProposalStatus =
  | "pending"
  | "active"
  | "queued"
  | "passed"
  | "defeated"
  | "no-quorum"
  | "expired"
  | "cancelled"
  | "executed"
  | "rejected";

export const PROPOSAL_STATUS_INFO: Record<
  ProposalStatus,
  { label: string; labelEn: string; icon: string; tone: "sky" | "emerald" | "amber" | "slate" | "red" }
> = {
  pending: { label: "Sắp mở bỏ phiếu", labelEn: "Voting opens soon", icon: "⏳", tone: "slate" },
  active: { label: "Đang bỏ phiếu", labelEn: "Voting open", icon: "🗳️", tone: "sky" },
  queued: { label: "Đã thông qua · đang chờ timelock", labelEn: "Passed · in timelock", icon: "🔒", tone: "amber" },
  expired: { label: "Quá hạn giải ngân", labelEn: "Disbursement expired", icon: "⌛", tone: "slate" },
  cancelled: { label: "Đã bị huỷ", labelEn: "Cancelled", icon: "🚫", tone: "red" },
  passed: { label: "Đã thông qua · chờ giải ngân", labelEn: "Passed · awaiting disbursement", icon: "✅", tone: "amber" },
  defeated: { label: "Không thông qua · chờ chốt", labelEn: "Not passed · awaiting finalization", icon: "👎", tone: "red" },
  "no-quorum": { label: "Không đủ quorum", labelEn: "Quorum not reached", icon: "⏸️", tone: "slate" },
  executed: { label: "Đã giải ngân", labelEn: "Disbursed", icon: "💸", tone: "emerald" },
  rejected: { label: "Đã bị từ chối", labelEn: "Rejected", icon: "❌", tone: "red" },
};

/** `blockNumber` detects the voting delay; without it a delayed proposal reads as active. */
export function getProposalStatus(p: OnChainProposal, nowSeconds: number, blockNumber?: bigint): ProposalStatus {
  if (p.cancelled) return "cancelled";
  const passedVote = p.votesFor > p.votesAgainst;
  if (p.finalized) return passedVote ? "executed" : "rejected";
  const now = BigInt(Math.floor(nowSeconds));
  if (now < p.deadline) {
    return blockNumber !== undefined && blockNumber <= p.snapshotBlock ? "pending" : "active";
  }
  if (p.votesFor + p.votesAgainst < p.quorumVotes) return "no-quorum";
  if (!passedVote) return "defeated";
  if (now < p.executeAfter) return "queued";
  return now > p.executeAfter + EXECUTION_GRACE_SECONDS ? "expired" : "passed";
}

/** execute() succeeds (barring treasury balance) only for these statuses. */
export function canExecute(status: ProposalStatus): boolean {
  return status === "passed" || status === "defeated";
}

// ───────────────────────── Description (title + body) ─────────────────────────

/** The contract stores one string; the first line is the project name. */
export const PROPOSAL_LIMITS = { title: 120, body: 2000 } as const;

export function encodeProposalDescription(title: string, body: string): string {
  const t = title.trim().replace(/\s*\n\s*/g, " ");
  const b = body.trim();
  return b ? `${t}\n\n${b}` : t;
}

/** Fallback title; stored in cached proposal data, so it is translated at display time. */
export const UNTITLED_PROPOSAL = "Đề xuất không có tiêu đề";

export function displayProposalTitle(title: string, locale: Locale): string {
  return title === UNTITLED_PROPOSAL ? pick(locale, title, "Untitled proposal") : title;
}

export function parseProposalDescription(description: string): { title: string; body: string } {
  const text = description.replace(/\r\n/g, "\n").trim();
  const newline = text.indexOf("\n");
  const title = (newline === -1 ? text : text.slice(0, newline)).trim();
  const body = newline === -1 ? "" : text.slice(newline + 1).trim();
  return {
    title: (title || UNTITLED_PROPOSAL).slice(0, PROPOSAL_LIMITS.title),
    body: body.slice(0, PROPOSAL_LIMITS.body * 2),
  };
}

// ───────────────────────── Form validation ─────────────────────────

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Parses a positive ETH amount ("0.05" or "0,05") to wei; null when invalid. */
export function parseEthAmount(value: string): bigint | null {
  const text = value.trim().replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,18}))?$/.exec(text);
  if (!match) return null;
  const wei = BigInt(match[1]) * 10n ** 18n + BigInt((match[2] ?? "").padEnd(18, "0") || "0");
  return wei > 0n ? wei : null;
}

export interface ProposalForm {
  title: string;
  body: string;
  amount: string;
  recipient: string;
}

/** Validates the create-proposal form; returns an error message or null. */
export function validateProposalForm(form: ProposalForm, locale: Locale = "vi"): string | null {
  const t = (vi: string, en: string) => pick(locale, vi, en);
  if (!form.title.trim()) return t("Vui lòng nhập tên dự án bảo tồn.", "Please enter the conservation project name.");
  if (form.title.trim().length > PROPOSAL_LIMITS.title) {
    return t(`Tên dự án tối đa ${PROPOSAL_LIMITS.title} ký tự.`, `Project name can be at most ${PROPOSAL_LIMITS.title} characters.`);
  }
  if (form.body.trim().length < 20) {
    return t("Mô tả cần ít nhất 20 ký tự để cộng đồng hiểu dự án.", "The description needs at least 20 characters so the community can understand the project.");
  }
  if (form.body.length > PROPOSAL_LIMITS.body) {
    return t(`Mô tả tối đa ${PROPOSAL_LIMITS.body} ký tự.`, `Description can be at most ${PROPOSAL_LIMITS.body} characters.`);
  }
  if (!parseEthAmount(form.amount)) return t("Số ETH yêu cầu không hợp lệ (ví dụ: 0.05).", "Invalid ETH amount (example: 0.05).");
  const recipient = form.recipient.trim();
  if (!ADDRESS_RE.test(recipient)) {
    return t("Địa chỉ ví nhận không hợp lệ (0x… gồm 40 ký tự hex).", "Invalid recipient address (0x… followed by 40 hex characters).");
  }
  if (recipient.toLowerCase() === ZERO_ADDRESS) {
    return t("Địa chỉ ví nhận không được là địa chỉ 0.", "The recipient cannot be the zero address.");
  }
  return null;
}

// ───────────────────────── Voting power ─────────────────────────

/**
 * ECO is ERC20Votes: tokens count as votes only after `delegate()`, and each
 * proposal uses voting power at its snapshot block (the block before it was created).
 */
export type VotingPowerState = "no-tokens" | "not-delegated" | "delegated-elsewhere" | "active";

export function getVotingPowerState(input: {
  user: string;
  balance: bigint;
  votes: bigint;
  delegatee: string | undefined;
}): VotingPowerState {
  const delegatee = input.delegatee?.toLowerCase();
  if (!delegatee || delegatee === ZERO_ADDRESS) return input.balance > 0n ? "not-delegated" : "no-tokens";
  if (delegatee !== input.user.toLowerCase()) return "delegated-elsewhere";
  return input.votes > 0n || input.balance > 0n ? "active" : "no-tokens";
}

// ───────────────────────── Display helpers ─────────────────────────

/** Share of For / Against in percent (0–100, one decimal), and quorum progress. */
export function getVoteBreakdown(p: Pick<OnChainProposal, "votesFor" | "votesAgainst" | "quorumVotes">) {
  const total = p.votesFor + p.votesAgainst;
  // Integer per-mille math, so the two shares add up to exactly 100 with no float noise.
  const perMille = (part: bigint, whole: bigint) => (whole === 0n ? 0n : (part * 1000n) / whole);
  const pct = (part: bigint, whole: bigint) => Number(perMille(part, whole)) / 10;
  const forPerMille = perMille(p.votesFor, total);
  return {
    total,
    forPct: Number(forPerMille) / 10,
    againstPct: total === 0n ? 0 : Number(1000n - forPerMille) / 10,
    quorumPct: p.quorumVotes === 0n ? 100 : Math.min(100, pct(total, p.quorumVotes)),
    quorumReached: total >= p.quorumVotes,
  };
}

const TIME_UNITS = {
  day: { vi: "ngày", en: "day" },
  hour: { vi: "giờ", en: "hour" },
  minute: { vi: "phút", en: "minute" },
  second: { vi: "giây", en: "second" },
} as const;

/** "3 ngày" / "3 days" / "1 day". */
function timeUnit(value: number, unit: keyof typeof TIME_UNITS, locale: Locale): string {
  const names = TIME_UNITS[unit];
  return locale === "en" ? `${value} ${names.en}${value === 1 ? "" : "s"}` : `${value} ${names.vi}`;
}

/** "2 ngày 4 giờ", "35 phút 10 giây"…; "Đã kết thúc" when not positive. */
export function formatCountdown(secondsLeft: number, locale: Locale = "vi"): string {
  if (secondsLeft <= 0) return pick(locale, "Đã kết thúc", "Ended");
  const s = Math.floor(secondsLeft);
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;
  const unit = (value: number, name: keyof typeof TIME_UNITS) => timeUnit(value, name, locale);
  if (days > 0) return `${unit(days, "day")} ${unit(hours, "hour")}`;
  if (hours > 0) return `${unit(hours, "hour")} ${unit(minutes, "minute")}`;
  if (minutes > 0) return `${unit(minutes, "minute")} ${unit(seconds, "second")}`;
  return unit(seconds, "second");
}

/** "3 ngày", "1 giờ", "1 ngày 12 giờ" for a voting period in seconds. */
export function formatDuration(seconds: number, locale: Locale = "vi"): string {
  const unit = (value: number, name: keyof typeof TIME_UNITS) => timeUnit(value, name, locale);
  if (seconds <= 0) return unit(0, "second");
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [days && unit(days, "day"), hours && unit(hours, "hour"), minutes && unit(minutes, "minute")].filter(Boolean);
  return parts.length ? parts.join(" ") : unit(seconds, "second");
}

export function formatBpsPercent(bps: bigint | number, locale: Locale = "vi"): string {
  return `${(Number(bps) / 100).toLocaleString(intlLocale(locale), { maximumFractionDigits: 2 })}%`;
}

/** Max proposals fetched in one page, newest first. */
export const PROPOSALS_PAGE_SIZE = 50;

/** IDs of the newest `limit` proposals (IDs start at 1, proposalCount is the last one). */
export function getRecentProposalIds(proposalCount: bigint, limit = PROPOSALS_PAGE_SIZE): bigint[] {
  const ids: bigint[] = [];
  for (let id = proposalCount; id >= 1n && ids.length < limit; id--) ids.push(id);
  return ids;
}

/** Parses a route segment like "3" to a proposal ID; null when invalid. */
export function parseProposalId(value: string | undefined): bigint | null {
  if (!value || !/^\d{1,30}$/.test(value)) return null;
  const id = BigInt(value);
  return id >= 1n ? id : null;
}
