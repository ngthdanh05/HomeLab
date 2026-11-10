// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ImpactBadge} from "./ImpactBadge.sol";

interface IEcoTokenMint {
    function mint(address to, uint256 amount) external;
}

interface ICarbonOffsetStats {
    function offsetCountOf(address user) external view returns (uint256);
    function offsetGramsOf(address user) external view returns (uint256);
}

interface IGovernanceVotes {
    function hasVoted(uint256 proposalId, address voter) external view returns (bool);
}

/// @title QuestRewards
/// @notice Eco Quests: conditions are checked on-chain and each wallet claims once per quest.
/// @dev Needs MINTER_ROLE on EcoToken and ImpactBadge. Requirements:
///      - BADGES_OF_TYPE: `target` badges of `proofBadgeType` originally issued to the wallet.
///      - OFFSET_COUNT / OFFSET_GRAMS: offsets made through CarbonOffset.
///      - DAO_VOTE: voted on proposal `proofIds[0]`.
///      - SELF_ATTESTED: unverifiable off-chain action.
///      Only BADGES_OF_TYPE may reward ECO: it is voting power and the others are nearly free to farm.
contract QuestRewards is Ownable2Step, ReentrancyGuard, Pausable {
    enum Requirement {
        BADGES_OF_TYPE,
        OFFSET_COUNT,
        OFFSET_GRAMS,
        DAO_VOTE,
        SELF_ATTESTED
    }

    struct Quest {
        Requirement requirement;
        /// @dev Proof badge type (BADGES_OF_TYPE only).
        ImpactBadge.BadgeType proofBadgeType;
        /// @dev Badge count, offset count or CO2 grams; unused for DAO_VOTE and SELF_ATTESTED.
        uint256 target;
        /// @dev ECO reward in wei.
        uint256 ecoReward;
        bool rewardsBadge;
        ImpactBadge.BadgeType rewardBadgeType;
        string badgeURI;
        bool active;
    }

    uint256 public constant MAX_PROOF_IDS = 50;

    IEcoTokenMint public immutable ecoToken;
    ImpactBadge public immutable impactBadge;
    ICarbonOffsetStats public immutable carbonOffset;
    IGovernanceVotes public immutable governance;

    Quest[] private _quests;
    mapping(address user => mapping(uint256 questId => bool)) public isCompleted;
    mapping(address user => uint256) public completedCountOf;

    event QuestAdded(uint256 indexed questId, Requirement requirement, uint256 target, uint256 ecoReward);
    event QuestActiveSet(uint256 indexed questId, bool active);
    event QuestCompleted(
        address indexed user, uint256 indexed questId, uint256 ecoReward, uint256 badgeTokenId
    );

    error ZeroAddress();
    error QuestNotFound(uint256 questId);
    error QuestInactive(uint256 questId);
    error AlreadyCompleted(uint256 questId);
    error RequirementNotMet(uint256 questId);
    error TooManyProofIds();
    error InvalidQuest();

    constructor(
        address ecoToken_,
        address impactBadge_,
        address carbonOffset_,
        address governance_,
        address initialOwner
    ) Ownable(initialOwner) {
        if (
            ecoToken_ == address(0) || impactBadge_ == address(0) || carbonOffset_ == address(0)
                || governance_ == address(0)
        ) revert ZeroAddress();
        ecoToken = IEcoTokenMint(ecoToken_);
        impactBadge = ImpactBadge(impactBadge_);
        carbonOffset = ICarbonOffsetStats(carbonOffset_);
        governance = IGovernanceVotes(governance_);
    }

    // ───────────────────────────── Admin ─────────────────────────────

    /// @notice Adds a quest; questId is its index.
    function addQuest(Quest calldata quest) external onlyOwner returns (uint256 questId) {
        bool countBased = quest.requirement == Requirement.BADGES_OF_TYPE
            || quest.requirement == Requirement.OFFSET_COUNT || quest.requirement == Requirement.OFFSET_GRAMS;
        if (countBased && quest.target == 0) revert InvalidQuest();
        if (quest.requirement == Requirement.BADGES_OF_TYPE && quest.target > MAX_PROOF_IDS) revert InvalidQuest();
        if (quest.requirement != Requirement.BADGES_OF_TYPE && quest.ecoReward > 0) revert InvalidQuest();
        if (quest.ecoReward == 0 && !quest.rewardsBadge) revert InvalidQuest();
        if (quest.rewardsBadge && bytes(quest.badgeURI).length == 0) revert InvalidQuest();
        // Rewarding the proof badge type would let users create their own proof.
        if (
            quest.rewardsBadge && quest.requirement == Requirement.BADGES_OF_TYPE
                && quest.rewardBadgeType == quest.proofBadgeType
        ) revert InvalidQuest();
        if (quest.rewardsBadge && quest.rewardBadgeType == ImpactBadge.BadgeType.ECO_CHECKIN) revert InvalidQuest();

        questId = _quests.length;
        _quests.push(quest);
        emit QuestAdded(questId, quest.requirement, quest.target, quest.ecoReward);
    }

    function setQuestActive(uint256 questId, bool active) external onlyOwner {
        _getQuest(questId).active = active;
        emit QuestActiveSet(questId, active);
    }

    /// @notice Emergency stop for all claims.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ───────────────────────────── Core ──────────────────────────────

    /// @notice Claims a quest whose requirement is met.
    /// @param proofIds BADGES_OF_TYPE: proof token ids, strictly ascending;
    ///                 DAO_VOTE: [proposalId]; otherwise empty.
    /// @return badgeTokenId Reward badge, or 0 if none.
    function claim(uint256 questId, uint256[] calldata proofIds)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 badgeTokenId)
    {
        Quest storage quest = _getQuest(questId);
        if (!quest.active) revert QuestInactive(questId);
        if (isCompleted[msg.sender][questId]) revert AlreadyCompleted(questId);
        if (proofIds.length > MAX_PROOF_IDS) revert TooManyProofIds();

        if (!_meetsRequirement(quest, msg.sender, proofIds)) revert RequirementNotMet(questId);

        // Effects
        isCompleted[msg.sender][questId] = true;
        completedCountOf[msg.sender] += 1;

        // Interactions (trusted project contracts)
        uint256 ecoReward = quest.ecoReward;
        if (ecoReward > 0) ecoToken.mint(msg.sender, ecoReward);
        if (quest.rewardsBadge) {
            badgeTokenId = impactBadge.mintBadge(msg.sender, quest.rewardBadgeType, quest.badgeURI);
        }

        emit QuestCompleted(msg.sender, questId, ecoReward, badgeTokenId);
    }

    // ───────────────────────────── Views ─────────────────────────────

    function questCount() external view returns (uint256) {
        return _quests.length;
    }

    function getQuest(uint256 questId) external view returns (Quest memory) {
        return _getQuest(questId);
    }

    function getQuests() external view returns (Quest[] memory) {
        return _quests;
    }

    /// @notice Completion state of every quest for `user`.
    function completedOf(address user) external view returns (bool[] memory done) {
        done = new bool[](_quests.length);
        for (uint256 i; i < done.length; ++i) {
            done[i] = isCompleted[user][i];
        }
    }

    /// @notice Checks whether `user` could claim with `proofIds`.
    /// @dev Never reverts; invalid proof returns false.
    function canClaim(address user, uint256 questId, uint256[] calldata proofIds) external view returns (bool) {
        if (questId >= _quests.length) return false;
        Quest storage quest = _quests[questId];
        if (!quest.active || isCompleted[user][questId] || proofIds.length > MAX_PROOF_IDS) return false;
        return _meetsRequirement(quest, user, proofIds);
    }

    // ─────────────────────────── Internals ───────────────────────────

    function _getQuest(uint256 questId) internal view returns (Quest storage) {
        if (questId >= _quests.length) revert QuestNotFound(questId);
        return _quests[questId];
    }

    function _meetsRequirement(Quest storage quest, address user, uint256[] calldata proofIds)
        internal
        view
        returns (bool)
    {
        Requirement req = quest.requirement;
        if (req == Requirement.OFFSET_COUNT) return carbonOffset.offsetCountOf(user) >= quest.target;
        if (req == Requirement.OFFSET_GRAMS) return carbonOffset.offsetGramsOf(user) >= quest.target;
        if (req == Requirement.DAO_VOTE) {
            return proofIds.length == 1 && governance.hasVoted(proofIds[0], user);
        }
        if (req == Requirement.SELF_ATTESTED) return true;

        // BADGES_OF_TYPE
        if (proofIds.length < quest.target) return false;
        uint256 previous;
        for (uint256 i; i < proofIds.length; ++i) {
            uint256 id = proofIds[i];
            // Strictly ascending, so no badge counts twice.
            if (id <= previous) return false;
            previous = id;
            try impactBadge.getBadge(id) returns (ImpactBadge.Badge memory badge) {
                if (badge.recipient != user || badge.badgeType != quest.proofBadgeType) return false;
            } catch {
                return false; // badge does not exist
            }
        }
        return true;
    }
}
