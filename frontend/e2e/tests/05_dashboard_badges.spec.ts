import { ADDRESSES, SEED, publicClient, walletFor } from "../fixtures/anvil";
import { expect, test } from "../fixtures/anvil.fixture";
import CarbonOffsetJson from "../../src/abis/CarbonOffset.json";
import EcoTokenJson from "../../src/abis/EcoToken.json";

test.use({ account: "buyer" });

test.describe("05 · Của tôi: việc cần làm, đơn hàng, tác động, huy hiệu", () => {
  test("chưa kết nối: xem trước huy hiệu mờ + kết nối ví; ví mới: chưa có ECO, huy hiệu, đơn", async ({ page, connectWallet }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Huy hiệu Người giữ biển bạn có thể nhận" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mới dùng ví lần đầu?" })).toHaveAttribute("href", "/getting-started");

    await connectWallet();
    const balance = page.getByRole("region", { name: "Số dư EcoToken" });
    // Tiêu đề liền ngay số dư ("…EcoToken0ECO").
    await expect(balance).toContainText(/EcoToken\s*0\s*ECO/);
    await expect(page.getByRole("region", { name: "Việc cần làm" })).toContainText("Không có việc nào đang chờ bạn");
    await expect(page.getByRole("button", { name: /Bấm để xem chi tiết/ })).toHaveCount(0);

    await page.getByRole("tab", { name: "Đơn hàng & Lịch đặt" }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=orders$/);
    await expect(page.getByText("Chưa có đơn hàng hay lịch đặt nào")).toBeVisible();
  });

  test("mua hàng → việc cần làm → xác nhận ở tab Đơn hàng → bù carbon: ECO, tác động, huy hiệu, lịch sử", async ({
    page,
    address,
    connectWallet,
  }) => {
    // 1) Mua qua UI: 0,01 ETH × 100 ECO/ETH = 1 ECO + huy hiệu ECO_CHECKIN (khi giải ngân).
    await page.goto("/marketplace/1");
    await connectWallet();
    await page.getByRole("button", { name: /Mua ngay · 0\.01 ETH/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công!" })).toBeVisible();
    await page.getByRole("link", { name: "Của tôi → Đơn hàng & Lịch đặt" }).click();

    // 2) Tab Đơn hàng: dòng tiến trình, liên hệ người bán off-chain, xác nhận qua hộp thoại.
    await expect(page.getByRole("tab", { name: "Đơn hàng & Lịch đặt" })).toHaveAttribute("aria-selected", "true");
    const order = page.getByRole("listitem", { name: new RegExp(`Đơn mua: ${SEED.listingName}`) });
    await expect(order.getByRole("list", { name: "Tiến trình đơn hàng" })).toContainText("Đã thanh toán");
    await order.getByText("Hẹn giao hàng với người bán").click();
    await expect(order.getByRole("link", { name: SEED.listingContact })).toHaveAttribute("href", "tel:0905123456");

    // Việc cần làm ở tab Tổng quan dẫn về đúng đơn.
    await page.getByRole("tab", { name: "Tổng quan" }).click();
    const todo = page.getByRole("region", { name: "Việc cần làm" });
    await expect(todo).toContainText("1 đơn hàng chờ bạn xác nhận");
    await todo.getByRole("button", { name: "Xem đơn hàng" }).click();

    await order.getByRole("button", { name: "Đã nhận hàng, giải ngân" }).click();
    await page.getByRole("dialog", { name: "Xác nhận đã nhận hàng?" }).getByRole("button", { name: "Xác nhận đã nhận hàng" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã xác nhận nhận hàng!" })).toBeVisible();
    await expect(order.getByRole("list", { name: "Tiến trình đơn hàng" })).toContainText("Đã giải ngân cho người bán");

    // 3) Bù carbon gửi thẳng tới contract (không qua trang này).
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

    // Tải lại trang để đọc giao dịch làm ngoài app.
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Số dư EcoToken" })).toContainText(/EcoToken\s*1\s*ECO/);

    const impact = page.getByRole("region", { name: "Tác động bảo tồn của tôi" });
    await expect(impact).toContainText("12 kg");
    // 20% của 0,01 ETH + toàn bộ phí bù 0,00012 ETH.
    await expect(impact).toContainText("0,00212 ETH");
    await expect(page.getByRole("region", { name: "Việc cần làm" })).not.toContainText("đơn hàng chờ bạn xác nhận");

    const gallery = page.getByRole("region", { name: "Huy hiệu Người giữ biển" });
    await expect(gallery.getByRole("button", { name: /^Ủng hộ nghệ nhân #1\./ })).toBeVisible();
    await expect(gallery.getByRole("button", { name: /^Bù đắp carbon #2\./ })).toBeVisible();
    await expect(gallery.getByRole("button", { name: /Bấm để xem chi tiết/ })).toHaveCount(2);

    // Lật một thẻ để xem chi tiết.
    await gallery.getByRole("button", { name: /^Ủng hộ nghệ nhân #1\./ }).click();
    await expect(gallery.getByRole("button", { name: /^Ủng hộ nghệ nhân #1\. Đang xem chi tiết/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const activity = page.getByRole("region", { name: "Lịch sử giao dịch" });
    await expect(activity).toContainText("Mua sản phẩm");
    await expect(activity).toContainText("Bù đắp carbon");
  });
});
