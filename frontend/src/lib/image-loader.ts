// next/image helpers for user-supplied images (IPFS gateways, inline data: URIs).
// Kept framework-free so it can be unit-tested with plain Node.

export interface ImageLoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Dedicated Pinata gateways (*.mypinata.cloud) resize/re-encode on the fly via
 * img-* query params. The public gateway.pinata.cloud ignores them (it returns
 * the original file), so it is not treated as resizable.
 */
export function isPinataDedicatedGateway(src: string): boolean {
  try {
    return new URL(src).hostname.endsWith(".mypinata.cloud");
  } catch {
    return false;
  }
}

/**
 * Custom next/image loader for IPFS images on a dedicated Pinata gateway: asks
 * for an image of the rendered width (WebP) instead of the full-size original.
 * Next's own optimizer is not used: gateways vary per listing and would all
 * have to be whitelisted in `images.remotePatterns`.
 */
export function ipfsImageLoader({ src, width, quality }: ImageLoaderArgs): string {
  const url = new URL(src);
  url.searchParams.set("img-width", String(width));
  url.searchParams.set("img-format", "webp");
  url.searchParams.set("img-quality", String(quality ?? 75));
  return url.toString();
}

/**
 * Props for next/image given an already-resolved source (see resolveImageUri):
 * dedicated Pinata gateway → resizing loader; anything else (public gateways,
 * data: URIs) → served as is.
 */
export function remoteImageProps(src: string): { loader: typeof ipfsImageLoader } | { unoptimized: true } {
  return isPinataDedicatedGateway(src) ? { loader: ipfsImageLoader } : { unoptimized: true };
}
