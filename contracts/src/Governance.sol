// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {CommunityTreasury} from "./CommunityTreasury.sol";

/// @title Governance
/// @notice DAO voting để quyết định giải ngân từ CommunityTreasury.
/// @dev Yêu cầu ECO Token là ERC20Votes (clock mặc định = block number).
///      Snapshot = block.number - 1 tại thời điểm propose (chống flash-loan).
///      Holder phải `delegate()` cho chính mình (hoặc người khác) để có voting power.
contract Governance is Ownable, ReentrancyGuard {
    struct Proposal {
        address proposer;
        address payable recipient;
        uint256 amount;
        string description;
        uint256 snapshotBlock;
        uint256 deadline;
        uint256 quorumVotes; // cố định tại lúc tạo proposal
        uint256 votesFor;
        uint256 votesAgainst;
        bool finalized; // đã executed hoặc rejected
    }

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MIN_VOTING_PERIOD = 1 hours;
    uint256 public constant MAX_VOTING_PERIOD = 90 days;

    IERC20 public immutable ecoToken;
    CommunityTreasury public immutable treasury;

    uint256 public proposalThreshold; // min ECO balance để propose
    uint256 public quorumBps; // 1000 = 10% total supply
    uint256 public votingPeriod; // giây

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    error ZeroAddress();
    error ZeroAmount();
    error BelowProposalThreshold(uint256 balance, uint256 required);
    error ProposalNotFound(uint256 proposalId);
    error VotingClosed();
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
    }

    // ───────────────────────── Admin config ─────────────────────────

    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        if (newPeriod < MIN_VOTING_PERIOD || newPeriod > MAX_VOTING_PERIOD) revert InvalidParameter();
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

    // ───────────────────────── Core ─────────────────────────

    /// @notice Tạo đề xuất giải ngân `amount` ETH cho `recipient`.
    function propose(address payable recipient, uint256 amount, string calldata description)
        external
        returns (uint256 proposalId)
    {
        uint256 bal = ecoToken.balanceOf(msg.sender);
        if (bal < proposalThreshold) revert BelowProposalThreshold(bal, proposalThreshold);
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 snapshot = block.number - 1;
        uint256 deadline = block.timestamp + votingPeriod;
        uint256 quorumVotes = (IVotes(address(ecoToken)).getPastTotalSupply(snapshot) * quorumBps) / BPS_DENOMINATOR;

        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.proposer = msg.sender;
        p.recipient = recipient;
        p.amount = amount;
        p.description = description;
        p.snapshotBlock = snapshot;
        p.deadline = deadline;
        p.quorumVotes = quorumVotes;

        emit ProposalCreated(proposalId, msg.sender, recipient, amount, snapshot, deadline, description);
    }

    /// @notice Vote cho/chống. Weight = voting power tại snapshot. Mỗi địa chỉ 1 lần.
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = _getProposal(proposalId);
        if (block.timestamp >= p.deadline) revert VotingClosed();
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

    /// @notice Kết thúc proposal sau deadline.
    ///         - Quorum không đạt  → revert.
    ///         - votesFor > votesAgainst → giải ngân + ProposalExecuted.
    ///         - Ngược lại → đánh dấu rejected + ProposalRejected.
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage p = _getProposal(proposalId);
        if (p.finalized) revert AlreadyFinalized();
        if (block.timestamp < p.deadline) revert VotingNotEnded();

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        if (totalVotes < p.quorumVotes) revert QuorumNotReached(totalVotes, p.quorumVotes);

        p.finalized = true;

        if (p.votesFor > p.votesAgainst) {
            treasury.disburse(proposalId, p.recipient, p.amount);
            emit ProposalExecuted(proposalId, p.recipient, p.amount);
        } else {
            emit ProposalRejected(proposalId, p.votesFor, p.votesAgainst);
        }
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
