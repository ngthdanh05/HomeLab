// Framework-free helpers for the Community DAO (unit-tested with plain Node).
// Mirrors contracts/src/Governance.sol and CommunityTreasury.sol.

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
}

/**
 * Lifecycle derived from on-chain fields (the contract only stores `finalized`):
 * - active      — voting open (now < deadline)
 * - passed      — voting over, quorum met, For > Against; anyone can execute → disbursement
 * - defeated    — voting over, quorum met, For ≤ Against; execute() records the rejection
 * - no-quorum   — voting over without quorum; execute() always reverts (QuorumNotReached)
 * - executed    — finalized with For > Against: Treasury has paid the recipient
 * - rejected    — finalized with For ≤ Against
 */
export type ProposalStatus = "active" | "passed" | "defeated" | "no-quorum" | "executed" | "rejected";

export const PROPOSAL_STATUS_INFO: Record<
  ProposalStatus,
  { label: string; icon: string; tone: "sky" | "emerald" | "amber" | "slate" | "red" }
> = {
  active: { label: "Đang bỏ phiếu", icon: "🗳️", tone: "sky" },
  passed: { label: "Đã thông qua · chờ giải ngân", icon: "✅", tone: "amber" },
  defeated: { label: "Không thông qua · chờ chốt", icon: "👎", tone: "red" },
  "no-quorum": { label: "Không đủ quorum", icon: "⏸️", tone: "slate" },
  executed: { label: "Đã giải ngân", icon: "💸", tone: "emerald" },
  rejected: { label: "Đã bị từ chối", icon: "❌", tone: "red" },
};

export function getProposalStatus(p: OnChainProposal, nowSeconds: number): ProposalStatus {
  const passedVote = p.votesFor > p.votesAgainst;
  if (p.finalized) return passedVote ? "executed" : "rejected";
  if (BigInt(Math.floor(nowSeconds)) < p.deadline) return "active";
  if (p.votesFor + p.votesAgainst < p.quorumVotes) return "no-quorum";
  return passedVote ? "passed" : "defeated";
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

export function parseProposalDescription(description: string): { title: string; body: string } {
  const text = description.replace(/\r\n/g, "\n").trim();
  const newline = text.indexOf("\n");
  const title = (newline === -1 ? text : text.slice(0, newline)).trim();
  const body = newline === -1 ? "" : text.slice(newline + 1).trim();
  return {
    title: (title || "Đề xuất không có tiêu đề").slice(0, PROPOSAL_LIMITS.title),
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
export function validateProposalForm(form: ProposalForm): string | null {
  if (!form.title.trim()) return "Vui lòng nhập tên dự án bảo tồn.";
  if (form.title.trim().length > PROPOSAL_LIMITS.title) return `Tên dự án tối đa ${PROPOSAL_LIMITS.title} ký tự.`;
  if (form.body.trim().length < 20) return "Mô tả cần ít nhất 20 ký tự để cộng đồng hiểu dự án.";
  if (form.body.length > PROPOSAL_LIMITS.body) return `Mô tả tối đa ${PROPOSAL_LIMITS.body} ký tự.`;
  if (!parseEthAmount(form.amount)) return "Số ETH yêu cầu không hợp lệ (ví dụ: 0.05).";
  const recipient = form.recipient.trim();
  if (!ADDRESS_RE.test(recipient)) return "Địa chỉ ví nhận không hợp lệ (0x… gồm 40 ký tự hex).";
  if (recipient.toLowerCase() === ZERO_ADDRESS) return "Địa chỉ ví nhận không được là địa chỉ 0.";
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

/** "2 ngày 4 giờ", "35 phút 10 giây"…; "Đã kết thúc" when not positive. */
export function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Đã kết thúc";
  const s = Math.floor(secondsLeft);
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

/** "3 ngày", "1 giờ", "1 ngày 12 giờ" for a voting period in seconds. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0 giây";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const parts = [days && `${days} ngày`, hours && `${hours} giờ`, minutes && `${minutes} phút`].filter(Boolean);
  return parts.length ? parts.join(" ") : `${seconds} giây`;
}

export function formatBpsPercent(bps: bigint | number): string {
  return `${(Number(bps) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
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
