import { parseEther } from "viem";
import { ADDRESSES } from "../fixtures/anvil";
import { expect, test } from "../fixtures/anvil.fixture";

test.use({ account: "traveller" });

test.describe("03 · Carbon Tracker", () => {
  test("nhập hành trình → tính CO₂ → bù đắp → mint badge ZERO_CARBON", async ({ page, chain, connectWallet }) => {
    const treasuryBefore = await chain.balanceOf(ADDRESSES.communityTreasury);

    await page.goto("/carbon-tracker");
    await connectWallet();

    // Default trip has two legs; keep one: 1 000 km by train × 0.035 kg/km = 35 kg CO₂.
    await page.getByRole("button", { name: "Xoá chặng 2" }).click();
    await page.getByLabel("Phương tiện").selectOption("train");
    await page.getByLabel("Quãng đường (km)").fill("1000");

    const summary = page.getByRole("region", { name: "🌱 Tóm tắt bù đắp" });
    await expect(summary).toContainText("Chuyến đi của bạn phát thải 35 kg CO₂");
    await expect(summary).toContainText("Đã được bù đắp bởi 0 badge ZERO_CARBON");

    // Fee = 35 kg × 0.00001 ETH/kg, all of it to the Community Treasury.
    await page.getByRole("button", { name: "🌍 Bù đắp 35 kg CO₂ · 0.00035 ETH" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã bù đắp carbon!" })).toBeVisible();
    await expect(summary).toContainText("Đã được bù đắp bởi 1 badge ZERO_CARBON");
    expect((await chain.balanceOf(ADDRESSES.communityTreasury)) - treasuryBefore).toBe(parseEther("0.00035"));

    await page.getByRole("link", { name: "🏅 Dashboard" }).click();
    await expect(page.getByRole("button", { name: /^Zero Carbon · 35 kg CO₂\./ })).toBeVisible();
  });
});
