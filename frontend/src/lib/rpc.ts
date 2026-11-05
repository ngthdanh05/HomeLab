// RPC endpoint selection for Sepolia (framework-free, unit-tested with Node).

export const SEPOLIA_CHAIN_ID = 11155111;

/** Public Sepolia endpoints used after NEXT_PUBLIC_SEPOLIA_RPC_URL, in order. */
export const SEPOLIA_PUBLIC_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
] as const;

// Hostname labels of provider endpoints for other networks, e.g. pasting an
// Alchemy "eth-mainnet" URL instead of "eth-sepolia", or an L2's "arb-sepolia".
const OTHER_NETWORK_LABEL =
  /(^|[.-])(mainnet|holesky|hoodi|goerli|arb|arbitrum|opt|optimism|base|polygon|matic|zksync|linea|scroll)([.-]|$)/i;

/** True when the URL is invalid or its hostname names a network other than Ethereum Sepolia. */
export function isLikelyWrongNetworkRpc(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return true;
    return OTHER_NETWORK_LABEL.test(hostname);
  } catch {
    return true;
  }
}

/** Ordered, de-duplicated Sepolia RPC URLs: the configured one first, then public fallbacks. */
export function getSepoliaRpcUrls(configuredUrl: string | undefined): string[] {
  const urls: string[] = [];
  const configured = configuredUrl?.trim();
  if (configured) {
    if (isLikelyWrongNetworkRpc(configured)) {
      console.error(
        "[rpc] NEXT_PUBLIC_SEPOLIA_RPC_URL does not look like a Sepolia endpoint and was ignored. " +
          "Use e.g. https://eth-sepolia.g.alchemy.com/v2/<key>.",
      );
    } else {
      urls.push(configured);
    }
  }
  for (const url of SEPOLIA_PUBLIC_RPCS) if (!urls.includes(url)) urls.push(url);
  return urls;
}

/** Hides API keys in RPC URLs before showing them in logs or UI. */
export function redactRpcUrl(url: string): string {
  try {
    const { protocol, host, pathname } = new URL(url);
    const redactedPath = pathname.replace(/\/[A-Za-z0-9_-]{16,}/g, "/***");
    return `${protocol}//${host}${redactedPath}`;
  } catch {
    return "<invalid url>";
  }
}
