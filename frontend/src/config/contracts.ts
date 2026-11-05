import type { Abi, Address } from "viem";
import { anvil, sepolia } from "wagmi/chains";
import EcoTokenJson from "../abis/EcoToken.json";
import ImpactBadgeJson from "../abis/ImpactBadge.json";
import CommunityTreasuryJson from "../abis/CommunityTreasury.json";
import GovernanceJson from "../abis/Governance.json";
import PaymentSplitterJson from "../abis/PaymentSplitter.json";
import MarketplaceJson from "../abis/Marketplace.json";

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
    ecoToken: "0xacB3267dBBeA4924cEE9e5631618DB8342f39a24",
    impactBadge: "0xba5404682DB9feb35fBB1cbC18b97f1A59b7a9C9",
    communityTreasury: "0x10E83c02C8667485EDd78ce57E0f6553D33296e6",
    governance: "0x1e0404A2EDC3BB2139A82d2e8372631A11697998",
    paymentSplitter: "0x5d574343A7e162Be9f3eA9Da676169d7Df874a66",
    marketplace: "0x92e554039D39014A5Fc55b31B1308f9DFe1098D5",
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

export const CONTRACT_ABIS: Readonly<Record<ContractName, Abi>> = {
  ecoToken: EcoTokenABI,
  impactBadge: ImpactBadgeABI,
  communityTreasury: CommunityTreasuryABI,
  governance: GovernanceABI,
  paymentSplitter: PaymentSplitterABI,
  marketplace: MarketplaceABI,
};
