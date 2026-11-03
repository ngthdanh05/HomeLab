"use client";

import { useAccount } from "wagmi";
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
  const { chainId: walletChainId, isConnected } = useAccount();
  const chainId: SupportedChainId =
    isConnected && isSupportedChain(walletChainId) ? walletChainId : DEFAULT_CHAIN_ID;

  return {
    chainId,
    addresses: getContractAddresses(chainId),
    walletChainId: isConnected ? walletChainId : undefined,
    isWrongNetwork: isConnected && !isSupportedChain(walletChainId),
  };
}
