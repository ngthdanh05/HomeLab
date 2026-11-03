// Unit tests for the marketplace helpers (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHARES,
  decodeDataJsonUri,
  detectImageType,
  encodeDataJsonUri,
  formatBps,
  getProductType,
  getRecentListingIds,
  getTxErrorMessage,
  normalizeMetadata,
  resolveImageUri,
  resolveUri,
  shortenAddress,
  splitPrice,
  validateListingText,
} from "../src/lib/marketplace.ts";

const GATEWAY = "https://gw.test/ipfs/";

describe("getRecentListingIds", () => {
  test("returns newest IDs first, stopping at 1", () => {
    assert.deepEqual(getRecentListingIds(4n), [3n, 2n, 1n]);
  });

  test("is empty when no listing exists yet", () => {
    assert.deepEqual(getRecentListingIds(1n), []);
  });

  test("respects the page size", () => {
    assert.deepEqual(getRecentListingIds(100n, 2), [99n, 98n]);
  });
});

describe("splitPrice", () => {
  test("matches the 70/20/10 split and sums to the price", () => {
    const price = 10n ** 17n; // 0.1 ETH
    const { artisan, treasury, platform } = splitPrice(price, DEFAULT_SHARES);
    assert.equal(artisan, 7n * 10n ** 16n);
    assert.equal(treasury, 2n * 10n ** 16n);
    assert.equal(platform, 10n ** 16n);
  });

  test("gives the rounding remainder to the platform", () => {
    const { artisan, treasury, platform } = splitPrice(7n, DEFAULT_SHARES);
    assert.equal(artisan + treasury + platform, 7n);
    assert.equal(artisan, 4n);
    assert.equal(treasury, 1n);
  });
});

describe("formatting", () => {
  test("formatBps converts basis points to a percentage", () => {
    assert.equal(formatBps(7000), "70%");
    assert.equal(formatBps(1250), "12,5%");
  });

  test("shortenAddress keeps prefix and suffix", () => {
    assert.equal(
      shortenAddress("0x37a036E7a5f85025C54837FcBD6927A8f7969242"),
      "0x37a0…9242",
    );
  });

  test("getProductType maps on-chain enum values and falls back to the first", () => {
    assert.equal(getProductType(2).label, "Tour trải nghiệm");
    assert.equal(getProductType(99).value, 0);
  });
});

describe("URI handling", () => {
  test("resolveUri maps ipfs:// to the gateway and rejects unsafe schemes", () => {
    assert.equal(resolveUri("ipfs://QmHash", GATEWAY), `${GATEWAY}QmHash`);
    assert.equal(resolveUri("ipfs://ipfs/QmHash", GATEWAY), `${GATEWAY}QmHash`);
    assert.equal(resolveUri("https://x.test/a.json", GATEWAY), "https://x.test/a.json");
    assert.equal(resolveUri("http://x.test/a.json", GATEWAY), null);
    assert.equal(resolveUri("javascript:alert(1)", GATEWAY), null);
  });

  test("resolveImageUri allows raster data URIs but not SVG", () => {
    assert.equal(resolveImageUri("data:image/png;base64,AAAA", GATEWAY), "data:image/png;base64,AAAA");
    assert.equal(resolveImageUri("data:image/svg+xml;base64,AAAA", GATEWAY), null);
    assert.equal(resolveImageUri(42, GATEWAY), null);
  });

  test("data JSON URIs round-trip with Vietnamese text", () => {
    const value = { name: "Đèn lồng Hội An", description: "Lụa tơ tằm" };
    assert.deepEqual(decodeDataJsonUri(encodeDataJsonUri(value)), value);
    assert.equal(decodeDataJsonUri("ipfs://QmHash"), null);
  });
});

describe("normalizeMetadata", () => {
  test("keeps valid fields and resolves the image", () => {
    assert.deepEqual(
      normalizeMetadata({ name: " Gốm ", description: "Thanh Hà", image: "ipfs://QmImg" }, GATEWAY),
      { name: "Gốm", description: "Thanh Hà", image: `${GATEWAY}QmImg` },
    );
  });

  test("drops unsafe images and rejects metadata without a name", () => {
    assert.equal(
      normalizeMetadata({ name: "A", image: "javascript:alert(1)" }, GATEWAY).image,
      undefined,
    );
    assert.equal(normalizeMetadata({ description: "no name" }, GATEWAY), null);
    assert.equal(normalizeMetadata(null, GATEWAY), null);
  });
});

describe("validateListingText", () => {
  test("requires a name and enforces length limits", () => {
    assert.equal(validateListingText("Gốm", ""), null);
    assert.match(validateListingText("  ", ""), /tên/i);
    assert.match(validateListingText("x".repeat(121), ""), /120/);
    assert.match(validateListingText("ok", "x".repeat(2001)), /2000/);
  });
});

describe("detectImageType", () => {
  test("recognises image formats by magic bytes", () => {
    assert.equal(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])), "image/png");
    assert.equal(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
    assert.equal(detectImageType(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39])), "image/gif");
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    assert.equal(detectImageType(webp), "image/webp");
  });

  test("rejects SVG/HTML disguised as images", () => {
    assert.equal(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  });
});

describe("getTxErrorMessage", () => {
  test("detects a rejection anywhere in the cause chain", () => {
    const error = { shortMessage: "x", cause: { name: "UserRejectedRequestError" } };
    assert.match(getTxErrorMessage(error), /huỷ giao dịch/);
  });

  test("maps Marketplace custom errors", () => {
    const error = { cause: { cause: { data: { errorName: "ListingNotActive" } } } };
    assert.match(getTxErrorMessage(error), /đã được bán/);
  });

  test("falls back to the viem short message, then a generic one", () => {
    assert.equal(getTxErrorMessage({ shortMessage: "RPC down" }), "RPC down");
    assert.match(getTxErrorMessage(new Error("boom")), /thất bại/);
  });
});
