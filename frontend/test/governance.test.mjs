// Unit tests for the Community DAO helpers (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  canExecute,
  encodeProposalDescription,
  formatCountdown,
  formatDuration,
  getProposalStatus,
  getRecentProposalIds,
  getVoteBreakdown,
  getVotingPowerState,
  parseEthAmount,
  parseProposalDescription,
  parseProposalId,
  validateProposalForm,
} from "../src/lib/governance.ts";
import { getTxErrorMessage } from "../src/lib/marketplace.ts";

const ECO = 10n ** 18n;
const USER = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const ZERO = "0x0000000000000000000000000000000000000000";
const proposal = (over = {}) => ({
  proposer: USER,
  recipient: OTHER,
  amount: ECO / 10n,
  description: "Dự án\n\nMô tả",
  snapshotBlock: 10n,
  deadline: 1_000n,
  executeAfter: 1_000n,
  cancelled: false,
  quorumVotes: 50n * ECO,
  votesFor: 0n,
  votesAgainst: 0n,
  finalized: false,
  ...over,
});

describe("getProposalStatus", () => {
  test("voting delay, timelock, expiry and guardian cancel", () => {
    const passed = { votesFor: 60n * ECO, executeAfter: 2_000n };
    assert.equal(getProposalStatus(proposal(), 500, 10n), "pending");
    assert.equal(getProposalStatus(proposal(), 500, 11n), "active");
    assert.equal(getProposalStatus(proposal(passed), 1_500), "queued");
    assert.equal(getProposalStatus(proposal(passed), 2_000), "passed");
    assert.equal(getProposalStatus(proposal(passed), 2_000 + 14 * 86_400), "passed");
    assert.equal(getProposalStatus(proposal(passed), 2_001 + 14 * 86_400), "expired");
    assert.equal(getProposalStatus(proposal({ cancelled: true, finalized: true, votesFor: 60n * ECO }), 0), "cancelled");
  });
  test("active strictly before the deadline (vote() requires now < deadline)", () => {
    assert.equal(getProposalStatus(proposal(), 999), "active");
    assert.notEqual(getProposalStatus(proposal(), 1_000), "active");
  });
  test("after the deadline: no-quorum / passed / defeated", () => {
    assert.equal(getProposalStatus(proposal({ votesFor: 49n * ECO }), 1_000), "no-quorum");
    assert.equal(getProposalStatus(proposal({ votesFor: 30n * ECO, votesAgainst: 20n * ECO }), 1_000), "passed");
    // Ties are rejected, as in Governance.execute (votesFor > votesAgainst).
    assert.equal(getProposalStatus(proposal({ votesFor: 25n * ECO, votesAgainst: 25n * ECO }), 1_000), "defeated");
  });
  test("finalized proposals are executed or rejected regardless of time", () => {
    assert.equal(getProposalStatus(proposal({ finalized: true, votesFor: 60n * ECO }), 0), "executed");
    assert.equal(getProposalStatus(proposal({ finalized: true, votesAgainst: 60n * ECO }), 0), "rejected");
  });
  test("zero quorum is reached with zero votes", () => {
    assert.equal(getProposalStatus(proposal({ quorumVotes: 0n }), 2_000), "defeated");
  });
  test("canExecute only for passed / defeated", () => {
    assert.deepEqual(
      ["active", "passed", "defeated", "no-quorum", "executed", "rejected"].filter(canExecute),
      ["passed", "defeated"],
    );
  });
});

describe("proposal description", () => {
  test("round-trips title and body", () => {
    const encoded = encodeProposalDescription("  Rừng ngập mặn  ", "  Trồng 2.000 cây\nđước  ");
    assert.equal(encoded, "Rừng ngập mặn\n\nTrồng 2.000 cây\nđước");
    assert.deepEqual(parseProposalDescription(encoded), { title: "Rừng ngập mặn", body: "Trồng 2.000 cây\nđước" });
  });
  test("newlines in the title are flattened", () => {
    assert.equal(encodeProposalDescription("A\nB", ""), "A B");
  });
  test("handles single-line, CRLF and empty descriptions (e.g. created via the contract directly)", () => {
    assert.deepEqual(parseProposalDescription("Chỉ tiêu đề"), { title: "Chỉ tiêu đề", body: "" });
    assert.deepEqual(parseProposalDescription("T\r\n\r\nB"), { title: "T", body: "B" });
    assert.equal(parseProposalDescription("").title, "Đề xuất không có tiêu đề");
  });
});

describe("form validation", () => {
  const form = (over = {}) => ({
    title: "Phục hồi rừng ngập mặn",
    body: "Trồng 2.000 cây đước cùng 30 hộ dân địa phương.",
    amount: "0.05",
    recipient: OTHER,
    ...over,
  });
  test("accepts a valid form", () => assert.equal(validateProposalForm(form()), null));
  test("rejects missing/too long fields", () => {
    assert.match(validateProposalForm(form({ title: "  " })), /tên dự án/);
    assert.match(validateProposalForm(form({ title: "x".repeat(121) })), /120/);
    assert.match(validateProposalForm(form({ body: "ngắn" })), /20 ký tự/);
    assert.match(validateProposalForm(form({ body: "x".repeat(2001) })), /2000/);
  });
  test("rejects bad amounts and addresses", () => {
    for (const amount of ["", "0", "abc", "-1", "1e3", "0.0000000000000000001"]) {
      assert.match(validateProposalForm(form({ amount })), /ETH/, amount);
    }
    assert.match(validateProposalForm(form({ recipient: "0x123" })), /không hợp lệ/);
    assert.match(validateProposalForm(form({ recipient: ZERO })), /địa chỉ 0/);
  });
  test("parseEthAmount is exact and accepts a decimal comma", () => {
    assert.equal(parseEthAmount("0.05"), 5n * 10n ** 16n);
    assert.equal(parseEthAmount("1,5"), 15n * 10n ** 17n);
    assert.equal(parseEthAmount("0.000000000000000001"), 1n);
    assert.equal(parseEthAmount("0"), null);
  });
});

describe("voting power", () => {
  test("states", () => {
    assert.equal(getVotingPowerState({ user: USER, balance: 0n, votes: 0n, delegatee: ZERO }), "no-tokens");
    assert.equal(getVotingPowerState({ user: USER, balance: ECO, votes: 0n, delegatee: ZERO }), "not-delegated");
    assert.equal(getVotingPowerState({ user: USER, balance: ECO, votes: 0n, delegatee: OTHER }), "delegated-elsewhere");
    // Address comparison is case-insensitive (checksummed vs lowercase).
    assert.equal(getVotingPowerState({ user: USER, balance: ECO, votes: ECO, delegatee: USER.toUpperCase().replace("0X", "0x") }), "active");
  });
});

describe("display helpers", () => {
  test("vote breakdown percentages and quorum", () => {
    const b = getVoteBreakdown({ votesFor: 2n * ECO, votesAgainst: ECO, quorumVotes: 6n * ECO });
    assert.equal(b.forPct, 66.6);
    assert.equal(b.againstPct, 33.4);
    assert.equal(b.quorumPct, 50);
    assert.equal(b.quorumReached, false);
    const none = getVoteBreakdown({ votesFor: 0n, votesAgainst: 0n, quorumVotes: 0n });
    assert.equal(none.forPct, 0);
    assert.equal(none.quorumReached, true);
    assert.equal(getVoteBreakdown({ votesFor: 9n, votesAgainst: 0n, quorumVotes: 3n }).quorumPct, 100);
  });
  test("countdown and duration", () => {
    assert.equal(formatCountdown(0), "Đã kết thúc");
    assert.equal(formatCountdown(45), "45 giây");
    assert.equal(formatCountdown(125), "2 phút 5 giây");
    assert.equal(formatCountdown(3 * 3600 + 120), "3 giờ 2 phút");
    assert.equal(formatCountdown(2 * 86400 + 4 * 3600), "2 ngày 4 giờ");
    assert.equal(formatDuration(3 * 86400), "3 ngày");
    assert.equal(formatDuration(3600), "1 giờ");
    assert.equal(formatDuration(30), "30 giây");
  });
  test("recent proposal IDs, newest first", () => {
    assert.deepEqual(getRecentProposalIds(0n), []);
    assert.deepEqual(getRecentProposalIds(3n), [3n, 2n, 1n]);
    assert.deepEqual(getRecentProposalIds(100n, 2), [100n, 99n]);
  });
  test("parseProposalId", () => {
    assert.equal(parseProposalId("3"), 3n);
    for (const bad of [undefined, "", "0", "-1", "1.5", "abc", "1e3"]) assert.equal(parseProposalId(bad), null, bad);
  });
});

describe("governance errors", () => {
  const revert = (errorName) => ({ name: "ContractFunctionExecutionError", cause: { data: { errorName } } });
  test("double vote shows 'Bạn đã vote rồi'", () => {
    assert.match(getTxErrorMessage(revert("AlreadyVoted")), /^Bạn đã vote rồi/);
  });
  test("other DAO errors are friendly", () => {
    const names = [
      "NoVotingPower",
      "VotingClosed",
      "VotingNotEnded",
      "QuorumNotReached",
      "AlreadyFinalized",
      "BelowProposalThreshold",
      "InsufficientBalance",
    ];
    for (const name of names) assert.doesNotMatch(getTxErrorMessage(revert(name)), /Giao dịch thất bại/, name);
  });
});
