// Unit tests for the dashboard helpers (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildActivityFeed,
  easeOutCubic,
  formatTokenAmount,
  getBadgeType,
  getBlockRanges,
  normalizeBadgeMetadata,
} from "../src/lib/dashboard.ts";

const GATEWAY = "https://gw.test/ipfs/";
const USER = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const OTHER = "0x3333333333333333333333333333333333333333";
const ETH = 10n ** 18n;

const ev = (eventName, args, tx, block, logIndex = 0) => ({
  eventName,
  args,
  transactionHash: tx,
  blockNumber: BigInt(block),
  logIndex,
});

describe("getBadgeType", () => {
  test("maps the contract enum", () => {
    assert.equal(getBadgeType(0).key, "ECO_CHECKIN");
    assert.equal(getBadgeType(3).key, "COMMUNITY_DONOR");
  });
  test("falls back for unknown values", () => {
    assert.equal(getBadgeType(99).key, "ECO_CHECKIN");
  });
});

describe("normalizeBadgeMetadata", () => {
  test("reads flat PLAN.md fields and resolves ipfs images", () => {
    const meta = normalizeBadgeMetadata(
      { name: " Hội An ", image: "ipfs://cid/a.png", location: "Hội An", carbonOffset: 12 },
      GATEWAY,
    );
    assert.deepEqual(meta, {
      name: "Hội An",
      description: undefined,
      image: "https://gw.test/ipfs/cid/a.png",
      location: "Hội An",
      action: undefined,
      carbonOffset: "12",
    });
  });

  test("reads OpenSea-style attributes", () => {
    const meta = normalizeBadgeMetadata({
      attributes: [
        { trait_type: "Location", value: "Sa Pa" },
        { trait_type: "carbon_offset", value: "5 kg" },
      ],
    });
    assert.equal(meta?.location, "Sa Pa");
    assert.equal(meta?.carbonOffset, "5 kg");
  });

  test("rejects unsafe images and empty input", () => {
    assert.equal(normalizeBadgeMetadata({ name: "x", image: "javascript:alert(1)" })?.image, undefined);
    assert.equal(normalizeBadgeMetadata({}), null);
    assert.equal(normalizeBadgeMetadata(null), null);
    assert.equal(normalizeBadgeMetadata([1]), null);
  });
});

describe("formatTokenAmount", () => {
  test("formats exactly with vi-VN separators", () => {
    assert.equal(formatTokenAmount(1234n * ETH + 5n * 10n ** 17n), "1.234,5");
    assert.equal(formatTokenAmount(0n), "0");
    assert.equal(formatTokenAmount(10n ** 14n), "0,0001");
    assert.equal(formatTokenAmount(10n ** 13n), "0");
  });
  test("does not lose precision on huge balances", () => {
    assert.equal(formatTokenAmount(100_000_000n * ETH + 1n * 10n ** 15n, 18), "100.000.000,001");
  });
});

describe("getBlockRanges", () => {
  test("splits into inclusive windows, newest first", () => {
    assert.deepEqual(getBlockRanges(0n, 9n, 4n), [
      { fromBlock: 6n, toBlock: 9n },
      { fromBlock: 2n, toBlock: 5n },
      { fromBlock: 0n, toBlock: 1n },
    ]);
  });
  test("is empty when from > to and rejects bad chunk sizes", () => {
    assert.deepEqual(getBlockRanges(10n, 9n, 4n), []);
    assert.throws(() => getBlockRanges(0n, 1n, 0n));
  });
});

test("easeOutCubic is clamped to [0, 1]", () => {
  assert.equal(easeOutCubic(-1), 0);
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(2), 1);
  assert.ok(easeOutCubic(0.5) > 0.5);
});

describe("buildActivityFeed", () => {
  test("groups a purchase tx with its split, ECO reward and badge", () => {
    const tx = "0xaaa";
    const events = [
      ev("ListingPurchased", { listingId: 3n, buyer: USER, seller: SELLER, price: ETH / 10n }, tx, 100, 3),
      ev("PaymentSplit", { artisan: SELLER, artisanAmt: 7n, treasuryAmt: 2n, platformAmt: 1n }, tx, 100, 1),
      ev("EcoRewarded", { visitor: USER, amount: 10n * ETH }, tx, 100, 0),
      ev("BadgeMinted", { to: USER, tokenId: 5n, badgeType: 0 }, tx, 100, 2),
    ];
    const [item, ...rest] = buildActivityFeed(events, USER.toUpperCase().replace("0X", "0x"));
    assert.equal(rest.length, 0);
    assert.equal(item.kind, "purchase");
    assert.equal(item.listingId, 3n);
    assert.equal(item.amountWei, ETH / 10n);
    assert.equal(item.ecoReward, 10n * ETH);
    assert.deepEqual(item.badges, [{ tokenId: 5n, badgeType: 0 }]);
    assert.deepEqual(item.split, { artisan: 7n, treasury: 2n, platform: 1n });
  });

  test("a sale reports the artisan share", () => {
    const tx = "0xbbb";
    const [item] = buildActivityFeed(
      [
        ev("ListingPurchased", { listingId: 1n, buyer: OTHER, seller: USER, price: 10n }, tx, 50),
        ev("PaymentSplit", { artisan: USER, artisanAmt: 7n, treasuryAmt: 2n, platformAmt: 1n }, tx, 50, 1),
        // Reward of the buyer must not be attributed to the seller.
        ev("EcoRewarded", { visitor: OTHER, amount: 1n }, tx, 50, 2),
      ],
      USER,
    );
    assert.equal(item.kind, "sale");
    assert.equal(item.amountWei, 7n);
    assert.equal(item.ecoReward, undefined);
  });

  test("dedupes repeated logs and sorts newest first", () => {
    const created = ev("ListingCreated", { listingId: 2n, seller: USER, price: 5n }, "0x01", 10);
    const cancelled = ev("ListingCancelled", { listingId: 2n, cancelledBy: USER }, "0x02", 20);
    const badge = ev("BadgeMinted", { to: USER, tokenId: 9n, badgeType: 1 }, "0x03", 30);
    const items = buildActivityFeed([created, created, cancelled, badge], USER);
    assert.deepEqual(
      items.map((i) => i.kind),
      ["badge", "cancel", "listing"],
    );
    assert.equal(items[2].amountWei, 5n);
  });

  test("ignores transactions that do not involve the user", () => {
    const items = buildActivityFeed(
      [ev("PaymentSplit", { artisan: OTHER, artisanAmt: 1n, treasuryAmt: 0n, platformAmt: 0n }, "0x9", 1)],
      USER,
    );
    assert.deepEqual(items, []);
  });
});
