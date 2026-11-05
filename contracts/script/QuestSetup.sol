// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {ImpactBadge} from "../src/ImpactBadge.sol";
import {QuestRewards} from "../src/QuestRewards.sol";

/// @notice Bộ quest mặc định (Task 4.4). Thứ tự = questId; phải khớp frontend/src/data/quests.ts.
library QuestSetup {
    uint256 internal constant QUEST_COUNT = 6;

    function _badgeURI(string memory name, string memory description, string memory action)
        private
        pure
        returns (string memory)
    {
        bytes memory json = abi.encodePacked(
            '{"name":"', name, '","description":"', description, '","action":"', action, '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(json));
    }

    function defaultQuests() internal pure returns (QuestRewards.Quest[] memory q) {
        q = new QuestRewards.Quest[](QUEST_COUNT);

        // 0 — Mua sản phẩm thủ công đầu tiên (1 badge ECO_CHECKIN từ Marketplace)
        q[0] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.BADGES_OF_TYPE,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 1,
            ecoReward: 10 ether,
            rewardsBadge: false,
            rewardBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            badgeURI: "",
            active: true
        });

        // 1 — Mua 3 sản phẩm thủ công → badge hiếm CULTURE_GUARDIAN
        q[1] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.BADGES_OF_TYPE,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 3,
            ecoReward: 30 ether,
            rewardsBadge: true,
            rewardBadgeType: ImpactBadge.BadgeType.CULTURE_GUARDIAN,
            badgeURI: _badgeURI(
                unicode"Quest · Người bảo trợ nghệ nhân",
                unicode"Hoàn thành Eco Quest: mua 3 sản phẩm thủ công trực tiếp từ nghệ nhân địa phương.",
                unicode"Mua 3 sản phẩm thủ công"
            ),
            active: true
        });

        // 2 — Bù đắp carbon lần đầu
        q[2] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.OFFSET_COUNT,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 1,
            ecoReward: 10 ether,
            rewardsBadge: false,
            rewardBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            badgeURI: "",
            active: true
        });

        // 3 — Tổng bù đắp ≥ 100 kg CO₂ → badge ZERO_CARBON
        q[3] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.OFFSET_GRAMS,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 100_000,
            ecoReward: 25 ether,
            rewardsBadge: true,
            rewardBadgeType: ImpactBadge.BadgeType.ZERO_CARBON,
            badgeURI: _badgeURI(
                unicode"Quest · Người hùng khí hậu",
                unicode"Hoàn thành Eco Quest: bù đắp tổng cộng từ 100 kg CO₂ trở lên.",
                unicode"Bù đắp ≥ 100 kg CO₂"
            ),
            active: true
        });

        // 4 — Tham gia vote DAO → badge COMMUNITY_DONOR
        q[4] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.DAO_VOTE,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 0,
            ecoReward: 20 ether,
            rewardsBadge: true,
            rewardBadgeType: ImpactBadge.BadgeType.COMMUNITY_DONOR,
            badgeURI: _badgeURI(
                unicode"Quest · Tiếng nói cộng đồng",
                unicode"Hoàn thành Eco Quest: biểu quyết một đề xuất giải ngân của DAO Quỹ Cộng đồng.",
                unicode"Vote DAO"
            ),
            active: true
        });

        // 5 — Xem các di sản 360° (off-chain, tự khai báo) → chỉ badge, không ECO
        q[5] = QuestRewards.Quest({
            requirement: QuestRewards.Requirement.SELF_ATTESTED,
            proofBadgeType: ImpactBadge.BadgeType.ECO_CHECKIN,
            target: 0,
            ecoReward: 0,
            rewardsBadge: true,
            rewardBadgeType: ImpactBadge.BadgeType.CULTURE_GUARDIAN,
            badgeURI: _badgeURI(
                unicode"Quest · Nhà thám hiểm di sản",
                unicode"Hoàn thành Eco Quest: khám phá các di sản số hoá 360° của MyHomeLab.",
                unicode"Xem di sản 360°"
            ),
            active: true
        });
    }

    function addDefaultQuests(QuestRewards quests) internal {
        QuestRewards.Quest[] memory q = defaultQuests();
        for (uint256 i; i < q.length; ++i) {
            quests.addQuest(q[i]);
        }
    }
}
