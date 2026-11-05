// Unit tests for Sepolia RPC selection (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SEPOLIA_PUBLIC_RPCS,
  getSepoliaRpcUrls,
  isLikelyWrongNetworkRpc,
  redactRpcUrl,
} from "../src/lib/rpc.ts";
import { isReceiptTimeoutError } from "../src/lib/marketplace.ts";

describe("isLikelyWrongNetworkRpc", () => {
  test("accepts Sepolia endpoints from common providers", () => {
    for (const url of [
      "https://eth-sepolia.g.alchemy.com/v2/abc",
      "https://sepolia.infura.io/v3/abc",
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://rpc.sepolia.org",
    ]) {
      assert.equal(isLikelyWrongNetworkRpc(url), false, url);
    }
  });

  test("rejects mainnet and L2 endpoints, even L2 Sepolia testnets", () => {
    for (const url of [
      "https://eth-mainnet.g.alchemy.com/v2/abc",
      "https://mainnet.infura.io/v3/abc",
      "https://arb-sepolia.g.alchemy.com/v2/abc",
      "https://base-sepolia.g.alchemy.com/v2/abc",
      "https://polygon-amoy.g.alchemy.com/v2/abc",
      "https://eth-holesky.g.alchemy.com/v2/abc",
    ]) {
      assert.equal(isLikelyWrongNetworkRpc(url), true, url);
    }
  });

  test("rejects invalid or non-http URLs", () => {
    assert.equal(isLikelyWrongNetworkRpc("not a url"), true);
    assert.equal(isLikelyWrongNetworkRpc("ftp://sepolia.example"), true);
  });
});

describe("getSepoliaRpcUrls", () => {
  test("puts the configured URL first, then public fallbacks", () => {
    const urls = getSepoliaRpcUrls(" https://eth-sepolia.g.alchemy.com/v2/key ");
    assert.deepEqual(urls, ["https://eth-sepolia.g.alchemy.com/v2/key", ...SEPOLIA_PUBLIC_RPCS]);
  });

  test("falls back to public RPCs when nothing is configured", () => {
    assert.deepEqual(getSepoliaRpcUrls(undefined), [...SEPOLIA_PUBLIC_RPCS]);
    assert.deepEqual(getSepoliaRpcUrls(""), [...SEPOLIA_PUBLIC_RPCS]);
  });

  test("ignores a mainnet URL configured by mistake", () => {
    const original = console.error;
    console.error = () => {};
    try {
      const urls = getSepoliaRpcUrls("https://eth-mainnet.g.alchemy.com/v2/key");
      assert.deepEqual(urls, [...SEPOLIA_PUBLIC_RPCS]);
    } finally {
      console.error = original;
    }
  });

  test("does not duplicate a public URL that is also configured", () => {
    const urls = getSepoliaRpcUrls("https://rpc.sepolia.org");
    assert.equal(urls.filter((u) => u === "https://rpc.sepolia.org").length, 1);
    assert.equal(urls[0], "https://rpc.sepolia.org");
  });
});

describe("redactRpcUrl", () => {
  test("hides API keys in the path", () => {
    assert.equal(
      redactRpcUrl("https://eth-sepolia.g.alchemy.com/v2/alch_abcdefghijklmnopqrstuv"),
      "https://eth-sepolia.g.alchemy.com/v2/***",
    );
    assert.equal(redactRpcUrl("https://rpc.sepolia.org"), "https://rpc.sepolia.org/");
  });
});

describe("isReceiptTimeoutError", () => {
  test("recognises viem's receipt timeout error only", () => {
    assert.equal(isReceiptTimeoutError({ name: "WaitForTransactionReceiptTimeoutError" }), true);
    assert.equal(isReceiptTimeoutError(new Error("boom")), false);
    assert.equal(isReceiptTimeoutError(null), false);
  });
});
