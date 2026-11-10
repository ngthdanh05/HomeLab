// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {CommunityTreasury} from "./CommunityTreasury.sol";

/// @title Governance
/// @notice DAO voting on CommunityTreasury disbursements.
/// @dev ECO is ERC20Votes, so holders must delegate to vote.
///      Snapshot = block.number - 1 + votingDelayBlocks, leaving time to delegate.
///      Passed proposals wait for a timelock, expire, and are capped by the treasury balance.
///      The guardian can cancel.
contract Governance is Ownable2Step, ReentrancyGuard {
    struct Proposal {
        address proposer;
        address payable recipient;
        uint256 amount;
        string description;
        uint256 snapshotBlock;
        uint256 deadline;
        uint256 quorumVotes; // fixed at creation
        uint256 votesFor;
        uint256 votesAgainst;
        bool finalized; // executed, rejected or cancelled
        uint256 executeAfter; // earliest execution time (deadline + executionDelay)
        bool cancelled; // cancelled by the guardian
    }

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_VOTING_PERIOD = 1 hours;
    uint256 public constant MAX_VOTING_PERIOD = 90 days;
    uint256 public constant MAX_VOTING_DELAY_BLOCKS = 50_400;
    uint256 public constant MAX_EXECUTION_DELAY = 30 days;
    /// @notice Execution window after executeAfter.
    uint256 public constant EXECUTION_GRACE_PERIOD = 14 days;
    /// @dev Only used to check that the voting delay fits in the voting period.
    uint256 internal constant ASSUMED_BLOCK_TIME = 12;

    IERC20 public immutable ecoToken;
    CommunityTreasury public immutable treasury;

    uint256 public proposalThreshold; // min ECO balance to propose
    uint256 public quorumBps; // 1000 = 10% total supply
    uint256 public votingPeriod; // seconds
    uint256 public votingDelayBlocks = 7_200; // ~1 day on Ethereum
    uint256 public executionDelay = 2 days;
    uint256 public maxDisbursementBps = 2_000; // max 20% of the treasury per proposal
    /// @notice Can cancel proposals; separate from owner, which may sit behind a timelock.
    address public guardian;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    error ZeroAddress();
    error ZeroAmount();
    error BelowProposalThreshold(uint256 balance, uint256 required);
    error ProposalNotFound(uint256 proposalId);
    error VotingClosed();
    error VotingNotStarted(uint256 snapshotBlock);
    error TimelockNotElapsed(uint256 executeAfter);
    error ProposalExpired();
    error ExceedsDisbursementCap(uint256 amount, uint256 cap);
    error NotGuardian();
    error VotingNotEnded();
    error AlreadyVoted();
    error NoVotingPower();
    error QuorumNotReached(uint256 totalVotes, uint256 required);
    error AlreadyFinalized();
    error InvalidParameter();

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed recipient,
        uint256 amount,
        uint256 snapshotBlock,
        uint256 deadline,
        string description
    );
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event ProposalRejected(uint256 indexed proposalId, uint256 votesFor, uint256 votesAgainst);
    event VotingPeriodUpdated(uint256 newValue);
    event ProposalThresholdUpdated(uint256 newValue);
    event QuorumBpsUpdated(uint256 newValue);
    event VotingDelayUpdated(uint256 newValue);
    event ExecutionDelayUpdated(uint256 newValue);
    event MaxDisbursementBpsUpdated(uint256 newValue);
    event GuardianUpdated(address indexed newGuardian);
    event ProposalCancelled(uint256 indexed proposalId);

    constructor(
        address ecoToken_,
        address payable treasury_,
        uint256 proposalThreshold_,
        uint256 quorumBps_,
        uint256 votingPeriod_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (ecoToken_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        if (quorumBps_ == 0 || quorumBps_ > BPS_DENOMINATOR) revert InvalidParameter();
        if (votingPeriod_ < MIN_VOTING_PERIOD || votingPeriod_ > MAX_VOTING_PERIOD) revert InvalidParameter();

        ecoToken = IERC20(ecoToken_);
        treasury = CommunityTreasury(treasury_);
        proposalThreshold = proposalThreshold_;
        quorumBps = quorumBps_;
        votingPeriod = votingPeriod_;
        guardian = initialOwner;
    }

    // ───────────────────────── Admin config ─────────────────────────

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_VOTING_PERIOD || newPeriod > MAX_VOTING_PERIOD) revert InvalidParameter();
        if (votingDelayBlocks * ASSUMED_BLOCK_TIME >= newPeriod) revert InvalidParameter();
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(newPeriod);
    }

    function setProposalThreshold(uint256 newThreshold) external onlyOwner {
        proposalThreshold = newThreshold;
        emit ProposalThresholdUpdated(newThreshold);
    }

    function setQuorumBps(uint256 newQuorumBps) external onlyOwner {
        if (newQuorumBps == 0 || newQuorumBps > BPS_DENOMINATOR) revert InvalidParameter();
        quorumBps = newQuorumBps;
        emit QuorumBpsUpdated(newQuorumBps);
    }

    function setVotingDelayBlocks(uint256 newDelay) external onlyOwner {
        if (newDelay > MAX_VOTING_DELAY_BLOCKS || newDelay * ASSUMED_BLOCK_TIME >= votingPeriod) {
            revert InvalidParameter();
        }
        votingDelayBlocks = newDelay;
        emit VotingDelayUpdated(newDelay);
    }

    function setExecutionDelay(uint256 newDelay) external onlyOwner {
        if (newDelay > MAX_EXECUTION_DELAY) revert InvalidParameter();
        executionDelay = newDelay;
        emit ExecutionDelayUpdated(newDelay);
    }

    function setMaxDisbursementBps(uint256 newBps) external onlyOwner {
        if (newBps == 0 || newBps > BPS_DENOMINATOR) revert InvalidParameter();
        maxDisbursementBps = newBps;
        emit MaxDisbursementBpsUpdated(newBps);
    }

    function setGuardian(address newGuardian) external onlyOwner {
        if (newGuardian == address(0)) revert ZeroAddress();
        guardian = newGuardian;
        emit GuardianUpdated(newGuardian);
    }

    /// @notice Cancels an unfinished proposal.
    function cancel(uint256 proposalId) external {
        if (msg.sender != guardian) revert NotGuardian();
        Proposal storage p = _getProposal(proposalId);
        if (p.finalized) revert AlreadyFinalized();
        p.finalized = true;
        p.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    // ───────────────────────── Core ─────────────────────────

    /// @notice Proposes paying `amount` ETH to `recipient`.
    function propose(address payable recipient, uint256 amount, string calldata description)
        external
        returns (uint256 proposalId)
    {
        uint256 bal = ecoToken.balanceOf(msg.sender);
        if (bal < proposalThreshold) revert BelowProposalThreshold(bal, proposalThreshold);
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 snapshot = block.number - 1 + votingDelayBlocks;
        uint256 deadline = block.timestamp + votingPeriod;
        // Latest finalized block, since the snapshot block may be in the future.
        uint256 quorumVotes =
            (IVotes(address(ecoToken)).getPastTotalSupply(block.number - 1) * quorumBps) / BPS_DENOMINATOR;

        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.proposer = msg.sender;
        p.recipient = recipient;
        p.amount = amount;
        p.description = description;
        p.snapshotBlock = snapshot;
        p.deadline = deadline;
        p.quorumVotes = quorumVotes;
        p.executeAfter = deadline + executionDelay;

        emit ProposalCreated(proposalId, msg.sender, recipient, amount, snapshot, deadline, description);
    }

    /// @notice Votes for or against, weighted at the snapshot. One vote per address.
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = _getProposal(proposalId);
        if (p.finalized || block.timestamp >= p.deadline) revert VotingClosed();
        if (block.number <= p.snapshotBlock) revert VotingNotStarted(p.snapshotBlock);
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = IVotes(address(ecoToken)).getPastVotes(msg.sender, p.snapshotBlock);
        if (weight == 0) revert NoVotingPower();

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /// @notice Finalizes a proposal after its deadline.
    ///         Reverts without quorum.
    ///         For > Against: pays out after the timelock, within the grace period.
    ///         Otherwise: records the rejection.
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage p = _getProposal(proposalId);
        if (p.finalized) revert AlreadyFinalized();
        if (block.timestamp < p.deadline) revert VotingNotEnded();

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        if (totalVotes < p.quorumVotes) revert QuorumNotReached(totalVotes, p.quorumVotes);

        if (p.votesFor <= p.votesAgainst) {
            p.finalized = true;
            emit ProposalRejected(proposalId, p.votesFor, p.votesAgainst);
            return;
        }

        if (block.timestamp < p.executeAfter) revert TimelockNotElapsed(p.executeAfter);
        if (block.timestamp > p.executeAfter + EXECUTION_GRACE_PERIOD) revert ProposalExpired();

        // An amount above the balance is left to Treasury's InsufficientBalance.
        uint256 available = address(treasury).balance;
        uint256 cap = (available * maxDisbursementBps) / BPS_DENOMINATOR;
        if (p.amount <= available && p.amount > cap) revert ExceedsDisbursementCap(p.amount, cap);

        p.finalized = true;
        treasury.disburse(proposalId, p.recipient, p.amount);
        emit ProposalExecuted(proposalId, p.recipient, p.amount);
    }

    // ───────────────────────── Views ─────────────────────────

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _getProposal(proposalId);
    }

    function _getProposal(uint256 proposalId) internal view returns (Proposal storage p) {
        p = _proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound(proposalId);
    }
}
