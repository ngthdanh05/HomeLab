// Unit tests for the Vietnamese / English helpers (run with --experimental-strip-types).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { intlLocale, normalizeLocale, ogLocale, pick } from "../src/lib/i18n.ts";
import { formatDateTime, formatTokenAmount, BADGE_TYPES } from "../src/lib/dashboard.ts";
import { formatCountdown, formatDuration, PROPOSAL_STATUS_INFO, displayProposalTitle, UNTITLED_PROPOSAL, validateProposalForm } from "../src/lib/governance.ts";
import { buildUploadMessage, getTxErrorMessage, PRODUCT_TYPES, validateListingText } from "../src/lib/marketplace.ts";
import { calculateTrip, formatKg, LEVEL_INFO, parseCarbonEstimateRequest, TRANSPORT_MODES } from "../src/lib/carbon-utils.ts";
import { QUESTS, localizeQuest } from "../src/data/quests.ts";
import { getHeritageItems, sampleHeritageItems } from "../src/data/heritage.ts";
import { culturalDestinations, getCulturalDestinations } from "../src/data/culturalData.ts";

const hasVietnameseMarks = (text) => /[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]/i.test(text);

describe("locale helpers", () => {
  test("unknown cookie values fall back to Vietnamese", () => {
    assert.equal(normalizeLocale("en"), "en");
    assert.equal(normalizeLocale("vi"), "vi");
    assert.equal(normalizeLocale("fr"), "vi");
    assert.equal(normalizeLocale(undefined), "vi");
  });

  test("pick and locale tags", () => {
    assert.equal(pick("vi", "a", "b"), "a");
    assert.equal(pick("en", "a", "b"), "b");
    assert.equal(intlLocale("en"), "en-US");
    assert.equal(ogLocale("vi"), "vi_VN");
  });
});

describe("formatting follows the language", () => {
  test("token amounts swap thousand and decimal separators", () => {
    const value = 1234567n * 10n ** 15n; // 1234.567
    assert.equal(formatTokenAmount(value, 18, 4), "1.234,567");
    assert.equal(formatTokenAmount(value, 18, 4, "en"), "1,234.567");
  });

  test("durations are pluralized in English", () => {
    assert.equal(formatDuration(3 * 86_400), "3 ngày");
    assert.equal(formatDuration(3 * 86_400, "en"), "3 days");
    assert.equal(formatDuration(86_400 + 3_600, "en"), "1 day 1 hour");
    assert.equal(formatCountdown(0, "en"), "Ended");
    assert.equal(formatCountdown(65, "en"), "1 minute 5 seconds");
  });

  test("kg and dates use the locale", () => {
    assert.equal(formatKg(1234.5), "1.234,5 kg CO₂");
    assert.equal(formatKg(1234.5, "en"), "1,234.5 kg CO₂");
    assert.match(formatDateTime(1_700_000_000, "en"), /\d{2}\/\d{2}\/2023/);
  });
});

describe("English text is complete", () => {
  test("labels have an English version", () => {
    for (const mode of TRANSPORT_MODES) assert.ok(mode.labelEn && !hasVietnameseMarks(mode.labelEn), mode.id);
    for (const type of PRODUCT_TYPES) assert.ok(type.labelEn);
    for (const badge of BADGE_TYPES) assert.ok(badge.descriptionEn && !hasVietnameseMarks(badge.descriptionEn), badge.key);
    for (const info of Object.values(LEVEL_INFO)) assert.ok(info.labelEn && info.hintEn);
    for (const info of Object.values(PROPOSAL_STATUS_INFO)) assert.ok(info.labelEn && !hasVietnameseMarks(info.labelEn));
  });

  test("every quest is translated and keeps its on-chain fields", () => {
    for (const quest of QUESTS) {
      const en = localizeQuest(quest, "en");
      assert.notEqual(en.title, quest.title, quest.key);
      assert.ok(!hasVietnameseMarks(`${en.title} ${en.description} ${en.action.label}`), quest.key);
      assert.equal(en.id, quest.id);
      assert.equal(en.action.href, quest.action.href);
      assert.equal(localizeQuest(quest, "vi"), quest);
    }
  });

  test("every heritage item and hotspot is translated", () => {
    const items = getHeritageItems("en");
    assert.equal(items.length, sampleHeritageItems.length);
    for (const item of items) {
      assert.ok(!hasVietnameseMarks(`${item.title} ${item.location} ${item.description}`), item.id);
      for (const hotspot of item.hotspots) assert.ok(!hasVietnameseMarks(`${hotspot.title} ${hotspot.description}`), hotspot.id);
    }
    // The 3D scene rebuilds when the hotspots array changes identity.
    assert.equal(getHeritageItems("en"), getHeritageItems("en"));
  });

  test("every destination is translated; phrases stay in the local language", () => {
    const destinations = getCulturalDestinations("en");
    assert.equal(destinations.length, culturalDestinations.length);
    destinations.forEach((d, i) => {
      const text = [d.name, d.region, d.description, ...d.dos, ...d.donts, ...d.customs, d.bestTime, d.carbonTip].join(" ");
      assert.ok(!hasVietnameseMarks(text), d.id);
      assert.equal(d.phrases.length, culturalDestinations[i].phrases.length);
    });
  });
});

describe("messages follow the language", () => {
  test("contract errors", () => {
    const error = { data: { errorName: "AlreadyVoted" } };
    assert.match(getTxErrorMessage(error), /Bạn đã vote/);
    assert.match(getTxErrorMessage(error, "en"), /already voted/);
    assert.match(getTxErrorMessage({ code: 4001 }, "en"), /cancelled/);
    assert.match(getTxErrorMessage({}, "en"), /Transaction failed/);
  });

  test("form validation", () => {
    assert.match(validateListingText("", "", "en"), /product name/);
    const form = { title: "", body: "", amount: "", recipient: "" };
    assert.match(validateProposalForm(form, "en"), /project name/);
    assert.match(validateProposalForm(form), /tên dự án/);
  });

  test("carbon request errors", () => {
    assert.throws(() => parseCarbonEstimateRequest({ description: "short" }, "en"), /at least 10 characters/);
  });

  test("calculator breakdown and fallback title", () => {
    assert.match(calculateTrip([{ mode: "train", km: 100 }], "en").breakdown[0].activity, /Train · 100 km/);
    assert.equal(displayProposalTitle(UNTITLED_PROPOSAL, "en"), "Untitled proposal");
    assert.equal(displayProposalTitle("Rừng ngập mặn", "en"), "Rừng ngập mặn");
  });

  test("upload signature text differs per language but keeps the address and time", () => {
    const address = "0xABCDEF0000000000000000000000000000000001";
    const en = buildUploadMessage(address, 123, "en");
    assert.notEqual(en, buildUploadMessage(address, 123, "vi"));
    assert.ok(en.includes(address.toLowerCase()) && en.includes("123"));
  });
});
