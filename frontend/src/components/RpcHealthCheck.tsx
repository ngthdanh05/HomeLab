"use client";

import { useEffect } from "react";
import { DEFAULT_CHAIN_ID } from "@/config/contracts";
import { SEPOLIA_RPC_URLS } from "@/config/wagmi";
import { SEPOLIA_CHAIN_ID, redactRpcUrl } from "@/lib/rpc";
import { useToast } from "./ui/Toast";

/**
 * Checks once that the primary Sepolia RPC really serves Sepolia. A URL for the
 * wrong network makes every contract read fail and receipts never arrive, so
 * surface it loudly instead of letting the UI look "stuck".
 */
export function RpcHealthCheck() {
  const { toast } = useToast();

  useEffect(() => {
    if (DEFAULT_CHAIN_ID !== SEPOLIA_CHAIN_ID) return;
    const url = SEPOLIA_RPC_URLS[0];
    const controller = new AbortController();

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<{ result?: string }>)
      .then(({ result }) => {
        const chainId = result ? Number.parseInt(result, 16) : NaN;
        if (chainId === SEPOLIA_CHAIN_ID) return;
        console.error(`[rpc] ${redactRpcUrl(url)} returned chainId ${chainId}, expected Sepolia.`);
        toast({
          title: "RPC đang trỏ sai mạng",
          description: `Endpoint ${redactRpcUrl(url)} không phải Sepolia. Kiểm tra NEXT_PUBLIC_SEPOLIA_RPC_URL.`,
          variant: "error",
          duration: 0,
        });
      })
      .catch((error: unknown) => {
        // Unreachable primary RPC is handled by the fallback transport; just log it.
        if (!controller.signal.aborted) console.warn(`[rpc] ${redactRpcUrl(url)} unreachable`, error);
      });

    return () => controller.abort();
  }, [toast]);

  return null;
}
