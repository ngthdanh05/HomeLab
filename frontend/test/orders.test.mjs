// Unit test cho đơn hàng, metadata nghệ nhân và liên hệ off-chain (lib/marketplace.ts).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_STATUS,
  buildSellerMessage,
  contactHref,
  formatArtisanLine,
  getOrderActions,
  getOrderStage,
  normalizeListingDetails,
  normalizeMetadata,
  orderNeedsAction,
} from "../src/lib/marketplace.ts";

const BUYER = "0x1111111111111111111111111111111111111111";
const SELLER = "0x2222222222222222222222222222222222222222";
const order = (status, paidAt = 1_000n) => ({ buyer: BUYER, paidAt, disputedAt: 0n, status, price: 10n ** 16n });

describe("metadata nghệ nhân / làng chài", () => {
  test("đọc artisan, village, contact, schedule; gộp khoảng trắng và cắt 120 ký tự", () => {
    const m = normalizeMetadata({
      name: "Đèn vỏ sò",
      artisan: "  Cô   Lan ",
      village: "Nhơn Lý",
      contact: "0905 123 456",
      schedule: "x".repeat(200),
    });
    assert.equal(m.artisan, "Cô Lan");
    assert.equal(m.village, "Nhơn Lý");
    assert.equal(m.contact, "0905 123 456");
    assert.equal(m.schedule.length, 120);
  });

  test("bỏ trường rỗng hoặc không phải chuỗi", () => {
    assert.deepEqual(normalizeListingDetails({ artisan: "", village: 12, contact: "   " }), {});
    const m = normalizeMetadata({ name: "A" });
    assert.equal("artisan" in m, false);
  });

  test("dòng nghệ nhân · làng chài", () => {
    assert.equal(formatArtisanLine({ artisan: "Cô Lan", village: "Nhơn Lý" }), "Cô Lan · Nhơn Lý");
    assert.equal(formatArtisanLine({ village: "Nhơn Lý" }), "Nhơn Lý");
    assert.equal(formatArtisanLine(undefined), null);
  });
});

describe("contactHref", () => {
  test("email, điện thoại, https", () => {
    assert.equal(contactHref("lan@example.com"), "mailto:lan@example.com");
    assert.equal(contactHref("0905 123 456"), "tel:0905123456");
    assert.equal(contactHref("+84 (905) 123-456"), "tel:+84905123456");
    assert.equal(contactHref("https://zalo.me/0905123456"), "https://zalo.me/0905123456");
  });

  test("không tạo link cho scheme nguy hiểm hoặc chữ tự do", () => {
    assert.equal(contactHref("javascript:alert(1)"), null);
    assert.equal(contactHref("http://example.com"), null);
    assert.equal(contactHref("Hỏi ở cảng cá"), null);
    assert.equal(contactHref(undefined), null);
  });
});

describe("getOrderStage", () => {
  test("đang giữ tiền: bước 2 đang chờ, có hạn tự động giải ngân", () => {
    const stage = getOrderStage(order(ORDER_STATUS.paid, 1_000n), 3_600n);
    assert.equal(stage.outcome, "escrow");
    assert.deepEqual(stage.steps.map((s) => s.state), ["done", "current", "upcoming"]);
    assert.equal(stage.releasableAt, 4_600);
  });

  test("hoàn tất, khiếu nại, hoàn tiền", () => {
    assert.deepEqual(getOrderStage(order(ORDER_STATUS.released), 1n).steps.map((s) => s.state), ["done", "done", "done"]);
    const disputed = getOrderStage(order(ORDER_STATUS.disputed), 1n);
    assert.equal(disputed.outcome, "disputed");
    assert.equal(disputed.steps[1].state, "warning");
    assert.equal(disputed.releasableAt, undefined);
    assert.equal(getOrderStage(order(ORDER_STATUS.refunded), 1n).outcome, "refunded");
  });
});

describe("orderNeedsAction", () => {
  const actions = (o, user, now = 0) =>
    getOrderActions({ order: o, seller: SELLER, arbiter: undefined, user, now, escrowPeriod: 3_600n });

  test("người mua cần xác nhận đơn đang giữ tiền", () => {
    assert.equal(orderNeedsAction(actions(order(ORDER_STATUS.paid), BUYER)), true);
  });

  test("người bán không có việc khi đơn chưa hết hạn; có việc khi được giải ngân", () => {
    assert.equal(orderNeedsAction(actions(order(ORDER_STATUS.paid), SELLER, 2_000)), false);
    assert.equal(orderNeedsAction(actions(order(ORDER_STATUS.paid), SELLER, 5_000)), true);
  });

  test("đơn đã hoàn tất không còn việc", () => {
    assert.equal(orderNeedsAction(actions(order(ORDER_STATUS.released), BUYER)), false);
  });
});

describe("buildSellerMessage", () => {
  test("ghi mã đơn, tên sản phẩm, ghi chú; không có ghi chú thì chỉ một dòng", () => {
    const msg = buildSellerMessage({ listingId: 7n, listingName: "Tour lặn Hòn Mun", note: " 2 khách, 12/12 ", isTour: true });
    assert.match(msg, /đặt tour "Tour lặn Hòn Mun" \(đơn #7\)/);
    assert.ok(msg.endsWith("\n2 khách, 12/12"));
    const en = buildSellerMessage({ listingId: 7n, listingName: "Lamp", note: "", isTour: false }, "en");
    assert.equal(en.includes("\n"), false);
    assert.match(en, /ordered "Lamp" \(order #7\)/);
  });
});
