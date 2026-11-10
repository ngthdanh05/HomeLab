"use client";

import { useAccount, useConfig } from "wagmi";
import {
  DEFAULT_CHAIN_ID,
  getContractAddresses,
  isSupportedChain,
  type SupportedChainId,
} from "@/config/contracts";

/**
 * Chain the app reads from and writes to: the connected wallet's chain when it
 * is supported, otherwise NEXT_PUBLIC_CHAIN_ID (useChainId() alone would fall
 * back to the first configured chain while no wallet is connected).
 */
export function useActiveChain() {
  const config = useConfig();
  const { chainId: walletChainId, isConnected } = useAccount();
  // Only the chain this build targets: a production build must not talk to a wallet's local node.
  const onAppChain = isConnected && walletChainId === DEFAULT_CHAIN_ID;
  const chainId: SupportedChainId = onAppChain && isSupportedChain(walletChainId) ? walletChainId : DEFAULT_CHAIN_ID;

  return {
    chainId,
    addresses: getContractAddresses(chainId),
    /** Block explorer base URL, e.g. https://sepolia.etherscan.io (none on Anvil). */
    explorerUrl: config.chains.find((c) => c.id === chainId)?.blockExplorers?.default.url,
    walletChainId: isConnected ? walletChainId : undefined,
    isWrongNetwork: isConnected && !onAppChain,
  };
}
