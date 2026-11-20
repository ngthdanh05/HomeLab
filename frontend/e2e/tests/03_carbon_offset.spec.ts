import { parseEther } from "viem";
import { ADDRESSES } from "../fixtures/anvil";
import { expect, openMyPage, test } from "../fixtures/anvil.fixture";

test.use({ account: "traveller" });

test.describe("03 · Hành trình xanh", () => {
  test("nhập hành trình → tính CO₂ → bù đắp → mint badge ZERO_CARBON", async ({ page, address, chain, connectWallet }) => {
    const treasuryBefore = await chain.balanceOf(ADDRESSES.communityTreasury);

    await page.goto("/carbon-tracker");
    await connectWallet();

    // The trip starts empty: no "your trip" figures until a distance is entered.
    const summary = page.getByRole("region", { name: "Tóm tắt bù đắp" });
    await expect(summary).toContainText("Bạn chưa nhập chuyến đi nào.");
    await expect(summary).not.toContainText("Chuyến đi của bạn phát thải");
    await expect(page.getByRole("button", { name: "Nhập hành trình để bù đắp" })).toBeDisabled();

    // One leg: 1 000 km by train × 0.035 kg/km = 35 kg CO₂.
    await page.getByLabel("Phương tiện").selectOption("train");
    await page.getByLabel("Quãng đường (km)").fill("1000");

    await expect(summary).toContainText("Chuyến đi của bạn phát thải 35 kg CO₂");
    await expect(summary).toContainText("Đã được bù đắp bởi 0 Huy hiệu Bù đắp carbon");
    await expect(page.getByText("Khoản này chưa phải tín chỉ carbon đã được kiểm định.")).toBeVisible();

    // Fee = 35 kg × 0.00001 ETH/kg, all of it to the Ocean Conservation Fund.
    await page.getByRole("button", { name: "Bù đắp 35 kg CO₂ · 0.00035 ETH" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã bù đắp carbon!" })).toBeVisible();
    await expect(summary).toContainText("Đã được bù đắp bởi 1 Huy hiệu Bù đắp carbon");
    expect((await chain.balanceOf(ADDRESSES.communityTreasury)) - treasuryBefore).toBe(parseEther("0.00035"));

    // Emoji trong menu đang được thay bằng icon lucide (aria-hidden): chấp nhận cả hai.
    await openMyPage(page, address);
    await expect(page.getByRole("button", { name: /^Bù đắp carbon · 35 kg CO₂\./ })).toBeVisible();
  });
});
