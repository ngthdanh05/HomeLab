import { connectedButton, expect, test } from "../fixtures/anvil.fixture";

test.describe("01 · Kết nối ví", () => {
  test("kết nối MetaMask (mock) → header hiển thị địa chỉ rút gọn và mạng Anvil", async ({
    page,
    address,
    connectWallet,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Connect Wallet" })).toBeVisible();

    await connectWallet();

    await expect(connectedButton(page, address)).toBeVisible();
    await expect(header.getByText("Anvil Localnet")).toBeVisible();
  });

  test("kết nối được giữ lại khi chuyển trang và tải lại trang", async ({ page, address, connectWallet }) => {
    await page.goto("/marketplace");
    await connectWallet();

    await page.getByRole("link", { name: "🏅 Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Tác động của bạn" })).toBeVisible();

    await page.reload();
    await expect(connectedButton(page, address)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tác động của bạn" })).toBeVisible();
  });
});
