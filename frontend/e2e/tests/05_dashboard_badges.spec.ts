import { ADDRESSES, publicClient, walletFor } from "../fixtures/anvil";
import { expect, test } from "../fixtures/anvil.fixture";
import CarbonOffsetJson from "../../src/abis/CarbonOffset.json";
import EcoTokenJson from "../../src/abis/EcoToken.json";

test.use({ account: "buyer" });

test.describe("05 · Dashboard & Badge Gallery", () => {
  test("ví mới: chưa có ECO và badge", async ({ page, connectWallet }) => {
    await page.goto("/dashboard");
    await connectWallet();
    const balance = page.getByRole("region", { name: "🌱 Số dư EcoToken" });
    // The heading text is directly followed by the amount ("…EcoToken0ECO").
    await expect(balance).toContainText(/EcoToken\s*0\s*ECO/);
    await expect(page.getByRole("button", { name: /Bấm để xem chi tiết/ })).toHaveCount(0);
  });

  test("sau khi mua hàng (UI) và bù đắp carbon (on-chain): ECO, badge và lịch sử đúng", async ({
    page,
    address,
    connectWallet,
  }) => {
    // 1) Purchase through the UI: 0.01 ETH × 100 ECO/ETH = 1 ECO + ECO_CHECKIN badge.
    await page.goto("/marketplace/1");
    await connectWallet();
    await page.getByRole("button", { name: /Mua ngay · 0\.01 ETH/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công! 🎉" })).toBeVisible();
    await page.getByRole("button", { name: /Đã nhận hàng/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã xác nhận nhận hàng!" })).toBeVisible();

    // 2) A carbon offset sent straight to the contract (not through this page).
    const wallet = walletFor("buyer");
    const hash = await wallet.writeContract({
      address: ADDRESSES.carbonOffset,
      abi: CarbonOffsetJson.abi,
      functionName: "offset",
      args: [12_000n, ""],
      value: 120_000_000_000_000n, // 12 kg × 0.00001 ETH
    });
    expect((await publicClient.waitForTransactionReceipt({ hash })).status).toBe("success");

    const onChainEco = (await publicClient.readContract({
      address: ADDRESSES.ecoToken,
      abi: EcoTokenJson.abi,
      functionName: "balanceOf",
      args: [address],
    })) as bigint;
    expect(onChainEco).toBe(10n ** 18n);

    // A full page load picks up the transaction made outside the app.
    await page.goto("/dashboard");
    const balance = page.getByRole("region", { name: "🌱 Số dư EcoToken" });
    await expect(balance).toContainText(/EcoToken\s*1\s*ECO/);

    const gallery = page.getByRole("region", { name: /Bộ sưu tập/ });
    await expect(gallery.getByRole("button", { name: /^Eco Check-in #1\./ })).toBeVisible();
    await expect(gallery.getByRole("button", { name: /^Zero Carbon #2\./ })).toBeVisible();
    await expect(gallery.getByRole("button", { name: /Bấm để xem chi tiết/ })).toHaveCount(2);

    // Flip a card to its details.
    await gallery.getByRole("button", { name: /^Eco Check-in #1\./ }).click();
    await expect(gallery.getByRole("button", { name: /^Eco Check-in #1\. Đang xem chi tiết/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const activity = page.getByRole("region", { name: /Lịch sử hoạt động/ });
    await expect(activity).toContainText("Mua sản phẩm");
    await expect(activity).toContainText("Bù đắp carbon");
  });
});
