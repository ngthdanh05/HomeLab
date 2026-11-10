import { parseEther } from "viem";
import { ACCOUNTS, ADDRESSES, SEED } from "../fixtures/anvil";
import { expect, test } from "../fixtures/anvil.fixture";

test.use({ account: "buyer" });

test.describe("02 · Mua hàng D2C trên Marketplace", () => {
  test("xem marketplace → mua listing → toast thành công, chia 70/20/10 → badge trên dashboard", async ({
    page,
    chain,
    connectWallet,
  }) => {
    const sellerBefore = await chain.balanceOf(ACCOUNTS.seller.address);
    const treasuryBefore = await chain.balanceOf(ADDRESSES.communityTreasury);

    await page.goto("/marketplace");
    await connectWallet();

    // Seeded listing, read from the chain.
    const card = page.getByRole("link", { name: new RegExp(SEED.listingName) });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByRole("heading", { level: 1, name: SEED.listingName })).toBeVisible();

    await page.getByRole("button", { name: /Mua ngay · 0\.01 ETH/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công! 🎉" })).toBeVisible();
    // "Đã mua ✓" until the listing refetch, then "Sản phẩm đã được bán"; disabled either way.
    await expect(page.getByRole("button", { name: /^(Đã mua ✓|Sản phẩm đã được bán)$/ })).toBeDisabled();

    // Escrow: nothing moves until the buyer confirms delivery.
    expect(await chain.balanceOf(ACCOUNTS.seller.address)).toBe(sellerBefore);
    await page.getByRole("button", { name: /Đã nhận hàng/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã xác nhận nhận hàng!" })).toBeVisible();

    // PaymentSplitter: 70% to the artisan, 20% to the Community Treasury.
    expect((await chain.balanceOf(ACCOUNTS.seller.address)) - sellerBefore).toBe(parseEther("0.007"));
    expect((await chain.balanceOf(ADDRESSES.communityTreasury)) - treasuryBefore).toBe(parseEther("0.002"));

    // The ECO_CHECKIN badge minted for the buyer shows up in the dashboard gallery.
    await page.getByRole("link", { name: "🏅 Dashboard" }).click();
    await expect(page.getByRole("button", { name: /^Eco Check-in #1\./ })).toBeVisible();
  });

  test("listing đã bán không mua lại được", async ({ page, connectWallet }) => {
    await page.goto("/marketplace/1");
    await connectWallet();
    await page.getByRole("button", { name: /Mua ngay/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công! 🎉" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Sản phẩm đã được bán" })).toBeDisabled();
  });
});
