import type { Abi, Address } from "viem";
import { anvil, sepolia } from "wagmi/chains";
import EcoTokenJson from "../abis/EcoToken.json";
import ImpactBadgeJson from "../abis/ImpactBadge.json";
import CommunityTreasuryJson from "../abis/CommunityTreasury.json";
import GovernanceJson from "../abis/Governance.json";
import PaymentSplitterJson from "../abis/PaymentSplitter.json";
import MarketplaceJson from "../abis/Marketplace.json";
import CarbonOffsetJson from "../abis/CarbonOffset.json";
import QuestRewardsJson from "../abis/QuestRewards.json";

export type ContractName =
  | "ecoToken"
  | "impactBadge"
  | "communityTreasury"
  | "governance"
  | "paymentSplitter"
  | "marketplace";

export type ContractAddresses = Readonly<Record<ContractName, Address>>;

// Deployed addresses per chain. Sepolia matches docs/DEPLOYMENTS.md; Anvil uses
// the deterministic addresses produced by `make deploy-local` from account #0.
export const DEPLOYMENTS = {
  [sepolia.id]: {
    ecoToken: "0xfB72749A4e02e51E9350249AAC58a78a54b972Ed",
    impactBadge: "0xf36F3835343A56832D2f7401f7434ECFf9186568",
    communityTreasury: "0xA0627F599c7937518F16327FD05f906326178e16",
    governance: "0x43c32746284cE1294Df74128eE53adbB8e464Ebf",
    paymentSplitter: "0xD227c3535d07E2c91B254138e05cB30C7fc3534D",
    marketplace: "0xa1BFdb605e28524147dac98925b15809a4b2aa17",
  },
  [anvil.id]: {
    ecoToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    impactBadge: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    communityTreasury: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    governance: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    paymentSplitter: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    marketplace: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  },
} as const satisfies Record<number, ContractAddresses>;

export type SupportedChainId = keyof typeof DEPLOYMENTS;

/**
 * First block worth scanning for each contract's events (a little before its
 * deployment), so activity history doesn't query the whole chain. Update this
 * when a contract is redeployed.
 */
export const LOGS_FROM_BLOCK: Record<
  SupportedChainId,
  Readonly<Record<"impactBadge" | "paymentSplitter" | "marketplace", bigint>> & {
    /** Defaults to the ImpactBadge block when unset (CarbonOffset is newer). */
    carbonOffset?: bigint;
    /** Governance (VoteCast) and QuestRewards; default to the ImpactBadge block. */
    governance?: bigint;
    questRewards?: bigint;
  }
> = {
  [sepolia.id]: {
    impactBadge: 12_103_904n,
    paymentSplitter: 12_103_904n,
    marketplace: 12_103_904n,
    carbonOffset: 12_103_904n,
    governance: 12_103_904n,
    questRewards: 12_103_904n,
  },
  [anvil.id]: {
    impactBadge: 0n,
    paymentSplitter: 0n,
    marketplace: 0n,
    carbonOffset: 0n,
    governance: 0n,
    questRewards: 0n,
  },
};

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId !== undefined && chainId in DEPLOYMENTS;
}

const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
export const DEFAULT_CHAIN_ID: SupportedChainId = isSupportedChain(envChainId)
  ? envChainId
  : sepolia.id;

const CHAIN_NAMES: Record<number, string> = {
  [sepolia.id]: "Sepolia Testnet",
  [anvil.id]: "Anvil Localnet",
};

/**
 * CarbonOffset is listed apart from the six core contracts, so it is optional per chain.
 */
const SEPOLIA_CARBON_OFFSET: Address = "0x181292372a2f4481543a80243F647241e731f956";
export const CARBON_OFFSET_ADDRESSES: Readonly<Partial<Record<SupportedChainId, Address>>> = {
  [sepolia.id]: SEPOLIA_CARBON_OFFSET,
  // Nonce 6 of Anvil account #0 in `make deploy-local`.
  [anvil.id]: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
};

export function getCarbonOffsetAddress(chainId?: number): Address | undefined {
  return isSupportedChain(chainId) ? CARBON_OFFSET_ADDRESSES[chainId] : undefined;
}

/**
 * QuestRewards, optional per chain like CarbonOffset.
 */
const SEPOLIA_QUEST_REWARDS: Address = "0xc55095db8b878dee92168865Dc2C7EEB31C222b3";
export const QUEST_REWARDS_ADDRESSES: Readonly<Partial<Record<SupportedChainId, Address>>> = {
  [sepolia.id]: SEPOLIA_QUEST_REWARDS,
  // Nonce 7 of Anvil account #0 in `make deploy-local`.
  [anvil.id]: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
};

export function getQuestRewardsAddress(chainId?: number): Address | undefined {
  return isSupportedChain(chainId) ? QUEST_REWARDS_ADDRESSES[chainId] : undefined;
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ID: ${chainId}`;
}

export function getContractAddresses(chainId?: number): ContractAddresses {
  return DEPLOYMENTS[isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID];
}

/** Addresses for the default chain (NEXT_PUBLIC_CHAIN_ID, falling back to Sepolia). */
export const CONTRACT_ADDRESSES = getContractAddresses(DEFAULT_CHAIN_ID);

// ABIs extracted from Foundry artifacts (contracts/out).
export const EcoTokenABI = EcoTokenJson.abi as Abi;
export const ImpactBadgeABI = ImpactBadgeJson.abi as Abi;
export const CommunityTreasuryABI = CommunityTreasuryJson.abi as Abi;
export const GovernanceABI = GovernanceJson.abi as Abi;
export const PaymentSplitterABI = PaymentSplitterJson.abi as Abi;
export const MarketplaceABI = MarketplaceJson.abi as Abi;
export const CarbonOffsetABI = CarbonOffsetJson.abi as Abi;
export const QuestRewardsABI = QuestRewardsJson.abi as Abi;

export const CONTRACT_ABIS: Readonly<Record<ContractName, Abi>> = {
  ecoToken: EcoTokenABI,
  impactBadge: ImpactBadgeABI,
  communityTreasury: CommunityTreasuryABI,
  governance: GovernanceABI,
  paymentSplitter: PaymentSplitterABI,
  marketplace: MarketplaceABI,
};
