// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
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
/// @notice Eco Quest (Task 4.4): du khách hoàn thành nhiệm vụ để nhận thêm ECO và badge hiếm.
///         Điều kiện của quest được kiểm tra on-chain ngay trong `claim`, mỗi ví chỉ nhận
///         thưởng một lần cho mỗi quest (trạng thái hoàn thành lưu on-chain).
/// @dev Cần MINTER_ROLE trên EcoToken (thưởng ECO) và ImpactBadge (thưởng badge).
///      Các loại điều kiện:
///      - BADGES_OF_TYPE: sở hữu bằng chứng `target` badge loại `proofBadgeType` mà ví này là
///        người nhận gốc (`Badge.recipient`, không đổi khi chuyển NFT → không mượn badge được).
///        Badge ECO_CHECKIN chỉ được Marketplace mint khi mua sản phẩm thủ công, nên đây là
///        bằng chứng mua hàng. Quest không bao giờ thưởng badge loại dùng làm bằng chứng.
///      - OFFSET_COUNT / OFFSET_GRAMS: số lần / tổng gram CO₂ đã bù đắp qua CarbonOffset.
///      - DAO_VOTE: đã vote proposal `proofIds[0]` trong Governance.
///      - SELF_ATTESTED: hành động off-chain (vd xem di sản 360°) không kiểm chứng được →
///        chỉ được thưởng badge, không thưởng ECO (ECO là quyền biểu quyết DAO).
contract QuestRewards is Ownable, ReentrancyGuard {
    enum Requirement {
        BADGES_OF_TYPE,
        OFFSET_COUNT,
        OFFSET_GRAMS,
        DAO_VOTE,
        SELF_ATTESTED
    }

    struct Quest {
        Requirement requirement;
        /// @dev Loại badge làm bằng chứng (chỉ dùng cho BADGES_OF_TYPE).
        ImpactBadge.BadgeType proofBadgeType;
        /// @dev Số lượng cần đạt: số badge / số lần offset / số gram CO₂. Bỏ qua với DAO_VOTE, SELF_ATTESTED.
        uint256 target;
        /// @dev ECO thưởng (đơn vị nhỏ nhất, 18 decimals).
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

    /// @notice Thêm quest mới; questId = vị trí trong danh sách (bắt đầu từ 0).
    function addQuest(Quest calldata quest) external onlyOwner returns (uint256 questId) {
        bool countBased = quest.requirement == Requirement.BADGES_OF_TYPE
            || quest.requirement == Requirement.OFFSET_COUNT || quest.requirement == Requirement.OFFSET_GRAMS;
        if (countBased && quest.target == 0) revert InvalidQuest();
        if (quest.requirement == Requirement.BADGES_OF_TYPE && quest.target > MAX_PROOF_IDS) revert InvalidQuest();
        if (quest.requirement == Requirement.SELF_ATTESTED && quest.ecoReward > 0) revert InvalidQuest();
        if (quest.ecoReward == 0 && !quest.rewardsBadge) revert InvalidQuest();
        if (quest.rewardsBadge && bytes(quest.badgeURI).length == 0) revert InvalidQuest();
        // Thưởng đúng loại badge dùng làm bằng chứng sẽ cho phép tự tạo bằng chứng.
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

    // ───────────────────────────── Core ──────────────────────────────

    /// @notice Nhận thưởng quest `questId` nếu đã đạt điều kiện.
    /// @param proofIds BADGES_OF_TYPE: tokenId các badge bằng chứng, tăng dần (không trùng);
    ///                 DAO_VOTE: [proposalId]; các loại khác: để trống.
    /// @return badgeTokenId Badge thưởng (0 nếu quest không thưởng badge).
    function claim(uint256 questId, uint256[] calldata proofIds)
        external
        nonReentrant
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

        // Interactions (contract tin cậy của dự án)
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

    /// @notice Trạng thái hoàn thành của `user` cho mọi quest (theo questId).
    function completedOf(address user) external view returns (bool[] memory done) {
        done = new bool[](_quests.length);
        for (uint256 i; i < done.length; ++i) {
            done[i] = isCompleted[user][i];
        }
    }

    /// @notice Kiểm tra trước (không tốn gas) xem `user` có claim được với `proofIds` hay không.
    /// @dev Không bao giờ revert; bằng chứng sai → false.
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
            // Tăng dần nghiêm ngặt → không dùng một badge hai lần (tokenId bắt đầu từ 1).
            if (id <= previous) return false;
            previous = id;
            try impactBadge.getBadge(id) returns (ImpactBadge.Badge memory badge) {
                if (badge.recipient != user || badge.badgeType != quest.proofBadgeType) return false;
            } catch {
                return false; // badge không tồn tại
            }
        }
        return true;
    }
}
