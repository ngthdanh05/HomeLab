// Unit tests for the Eco Quest helpers (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { QUESTS, getQuest } from "../src/data/quests.ts";
import { HERITAGE_IDS } from "../src/data/heritage.ts";
import {
  computeQuestProgress,
  formatQuestCount,
  handicraftProofIds,
  parseViewedHeritage,
} from "../src/lib/quests.ts";

const USER = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const badge = (tokenId, badgeType, recipient = USER) => ({ tokenId: BigInt(tokenId), badgeType, recipient });
const stats = (over = {}) => ({
  badges: [],
  offsetCount: 0n,
  offsetGrams: 0n,
  votedProposalIds: [],
  viewedHeritageIds: [],
  ...over,
});
const byKey = (key) => QUESTS.find((q) => q.key === key);

describe("quest definitions", () => {
  test("ids match their position (= on-chain questId) and are unique", () => {
    QUESTS.forEach((q, i) => assert.equal(q.id, i));
    assert.equal(new Set(QUESTS.map((q) => q.key)).size, QUESTS.length);
    assert.ok(QUESTS.length >= 5);
  });
  test("mirror contracts/script/QuestSetup.sol rewards and targets", () => {
    assert.deepEqual(
      QUESTS.map((q) => [q.target, q.ecoReward, q.rewardBadgeType ?? null]),
      [
        [1, 10, null],
        [3, 30, 2],
        [1, 0, 3],
        [100_000, 0, 1],
        [1, 0, 3],
        [HERITAGE_IDS.length, 0, 2],
      ],
    );
  });
  test("the self-attested heritage quest never mints ECO", () => {
    assert.equal(byKey("heritage-explorer").ecoReward, 0);
  });
  test("getQuest", () => {
    assert.equal(getQuest(2).key, "first-offset");
    assert.equal(getQuest(99), undefined);
  });
});

describe("handicraftProofIds", () => {
  test("keeps the user's ECO_CHECKIN badges, sorted ascending and unique", () => {
    const ids = handicraftProofIds(
      [badge(9, 0), badge(3, 0), badge(5, 1), badge(4, 0, OTHER), badge(3, 0), badge(7, 0, USER.toUpperCase().replace("0X", "0x"))],
      USER,
    );
    assert.deepEqual(ids, [3n, 7n, 9n]);
  });
});

describe("computeQuestProgress", () => {
  test("handicraft quests count badges and pass exactly `target` proof IDs", () => {
    const s = stats({ badges: [badge(8, 0), badge(2, 0), badge(5, 0), badge(6, 2)] });
    const first = computeQuestProgress(byKey("first-handicraft"), s, USER, false);
    assert.equal(first.state, "ready");
    assert.deepEqual(first.proofIds, [2n]);

    const three = computeQuestProgress(byKey("artisan-patron"), s, USER, false);
    assert.equal(three.state, "ready");
    assert.deepEqual(three.proofIds, [2n, 5n, 8n]);
  });

  test("partial progress and ratio", () => {
    const p = computeQuestProgress(byKey("artisan-patron"), stats({ badges: [badge(1, 0)] }), USER, false);
    assert.equal(p.state, "in-progress");
    assert.equal(p.current, 1);
    assert.equal(p.target, 3);
    assert.ok(Math.abs(p.ratio - 1 / 3) < 1e-9);
  });

  test("carbon quests use CarbonOffset stats", () => {
    assert.equal(computeQuestProgress(byKey("first-offset"), stats({ offsetCount: 1n }), USER, false).state, "ready");
    const hero = computeQuestProgress(byKey("climate-hero"), stats({ offsetGrams: 99_999n }), USER, false);
    assert.equal(hero.state, "in-progress");
    assert.equal(
      computeQuestProgress(byKey("climate-hero"), stats({ offsetGrams: 155_790n }), USER, false).current,
      100_000,
    );
  });

  test("DAO vote quest passes the voted proposal ID", () => {
    const p = computeQuestProgress(byKey("dao-voter"), stats({ votedProposalIds: [4n, 7n] }), USER, false);
    assert.equal(p.state, "ready");
    assert.deepEqual(p.proofIds, [4n]);
    assert.equal(computeQuestProgress(byKey("dao-voter"), stats(), USER, false).state, "in-progress");
  });

  test("heritage quest counts distinct known items only", () => {
    const q = byKey("heritage-explorer");
    const partial = computeQuestProgress(q, stats({ viewedHeritageIds: [HERITAGE_IDS[0], HERITAGE_IDS[0], "fake"] }), USER, false);
    assert.equal(partial.current, 1);
    const all = computeQuestProgress(q, stats({ viewedHeritageIds: [...HERITAGE_IDS] }), USER, false);
    assert.equal(all.state, "ready");
  });

  test("completed wins; unknown data is 'loading'", () => {
    assert.equal(computeQuestProgress(byKey("artisan-patron"), stats(), USER, true).state, "completed");
    assert.equal(computeQuestProgress(byKey("artisan-patron"), stats({ badges: undefined }), USER, false).state, "loading");
    assert.equal(computeQuestProgress(byKey("first-offset"), stats({ offsetCount: undefined }), USER, false).state, "loading");
    assert.equal(computeQuestProgress(byKey("dao-voter"), stats({ votedProposalIds: undefined }), USER, false).state, "loading");
  });

  test("never offers a claim before completion status is known", () => {
    const p = computeQuestProgress(byKey("first-offset"), stats({ offsetCount: 2n }), USER, undefined);
    assert.equal(p.state, "loading");
  });
});

test("formatQuestCount shows kg for the grams quest", () => {
  assert.equal(formatQuestCount(byKey("climate-hero"), 100_000), "100 kg");
  assert.equal(formatQuestCount(byKey("climate-hero"), 55_500), "55,5 kg");
  assert.equal(formatQuestCount(byKey("artisan-patron"), 2), "2");
});

describe("parseViewedHeritage", () => {
  test("keeps known unique IDs and ignores garbage", () => {
    assert.deepEqual(parseViewedHeritage(JSON.stringify([HERITAGE_IDS[1], "x", 3, HERITAGE_IDS[1]])), [HERITAGE_IDS[1]]);
    assert.deepEqual(parseViewedHeritage("not json"), []);
    assert.deepEqual(parseViewedHeritage('{"a":1}'), []);
    assert.deepEqual(parseViewedHeritage(null), []);
  });
});
