"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useModal } from "connectkit";
import type { Abi, Address, Hash, TransactionReceipt } from "viem";
import { useAccount, useConfig, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useToast } from "@/components/ui/Toast";
import { getTxErrorMessage } from "@/lib/marketplace";
import { useActiveChain } from "./useActiveChain";

export type TxStatus = "idle" | "awaiting-wallet" | "pending" | "success" | "error";

export interface ContractTxRequest {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

interface TxMessages {
  pending: string;
  success: string;
}

/**
 * Sends a contract write and waits for it to be mined, handling the shared
 * concerns of every marketplace action: wallet connection, wrong network,
 * status/toast feedback, friendly errors and refreshing on-chain reads.
 */
export function useContractTx({ pending, success }: TxMessages) {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { isConnected, chainId: walletChainId } = useAccount();
  const { chainId } = useActiveChain();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { setOpen: setConnectModalOpen } = useModal();
  const { toast, dismiss } = useToast();

  const [status, setStatus] = useState<TxStatus>("idle");
  const [hash, setHash] = useState<Hash>();

  const send = useCallback(
    async (request: ContractTxRequest): Promise<TransactionReceipt | null> => {
      if (!isConnected) {
        setConnectModalOpen(true);
        return null;
      }

      const explorer = config.chains.find((c) => c.id === chainId)?.blockExplorers?.default.url;
      const txLink = (txHash: Hash) =>
        explorer ? { href: `${explorer}/tx/${txHash}`, label: "Xem trên Etherscan" } : undefined;

      let pendingToastId: number | undefined;
      try {
        setStatus("awaiting-wallet");
        if (walletChainId !== chainId) await switchChainAsync({ chainId });

        const txHash = await writeContractAsync({ ...request, chainId });
        setHash(txHash);
        setStatus("pending");
        pendingToastId = toast({
          title: pending,
          description: "Đang chờ giao dịch được xác nhận trên blockchain…",
          variant: "info",
          link: txLink(txHash),
          duration: 0,
        });

        const receipt = await waitForTransactionReceipt(config, { hash: txHash, chainId });
        if (receipt.status !== "success") throw new Error("Giao dịch bị revert on-chain.");

        setStatus("success");
        toast({ title: success, variant: "success", link: txLink(txHash) });
        // Refresh wagmi reads so listings, balances and badges update.
        await queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "readContract" || q.queryKey[0] === "readContracts",
        });
        return receipt;
      } catch (error) {
        console.error(error);
        setStatus("error");
        toast({
          title: "Giao dịch thất bại",
          description: getTxErrorMessage(error),
          variant: "error",
        });
        return null;
      } finally {
        if (pendingToastId !== undefined) dismiss(pendingToastId);
      }
    },
    [
      isConnected,
      walletChainId,
      chainId,
      config,
      pending,
      success,
      queryClient,
      switchChainAsync,
      writeContractAsync,
      setConnectModalOpen,
      toast,
      dismiss,
    ],
  );

  return {
    send,
    status,
    hash,
    isBusy: status === "awaiting-wallet" || status === "pending",
  };
}
