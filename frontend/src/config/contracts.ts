import EcoTokenJson from "../abis/EcoToken.json";
import ImpactBadgeJson from "../abis/ImpactBadge.json";
import CommunityTreasuryJson from "../abis/CommunityTreasury.json";
import GovernanceJson from "../abis/Governance.json";
import PaymentSplitterJson from "../abis/PaymentSplitter.json";
import MarketplaceJson from "../abis/Marketplace.json";

// Import địa chỉ hợp đồng đã deploy (Sepolia / Anvil Local)
export const CONTRACT_ADDRESSES = {
  ecoToken: "0xacB3267dBBeA4924cEE9e5631618DB8342f39a24",
  impactBadge: "0xba5404682DB9feb35fBB1cbC18b97f1A59b7a9C9",
  communityTreasury: "0x10E83c02C8667485EDd78ce57E0f6553D33296e6",
  governance: "0x1e0404A2EDC3BB2139A82d2e8372631A11697998",
  paymentSplitter: "0x703B08397D144cCA8208E5dAf29ec8CfFFb49A6a",
  marketplace: "0x20b00321Fe96B07817F6C8b0CD197F719d856983",
} as const;

// ABIs trích xuất trực tiếp từ Foundry artifacts
export const EcoTokenABI = EcoTokenJson.abi;
export const ImpactBadgeABI = ImpactBadgeJson.abi;
export const CommunityTreasuryABI = CommunityTreasuryJson.abi;
export const GovernanceABI = GovernanceJson.abi;
export const PaymentSplitterABI = PaymentSplitterJson.abi;
export const MarketplaceABI = MarketplaceJson.abi;

export const CONTRACT_ABIS = {
  ecoToken: EcoTokenABI,
  impactBadge: ImpactBadgeABI,
  communityTreasury: CommunityTreasuryABI,
  governance: GovernanceABI,
  paymentSplitter: PaymentSplitterABI,
  marketplace: MarketplaceABI,
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;
