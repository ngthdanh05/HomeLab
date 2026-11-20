import { connectedButton, expect, openMyPage, test } from "../fixtures/anvil.fixture";

test.describe("01 · Kết nối ví", () => {
  test("kết nối MetaMask (mock) → header hiển thị địa chỉ rút gọn và mạng Anvil", async ({
    page,
    address,
    connectWallet,
  }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Kết nối ví" })).toBeVisible();

    await connectWallet();

    await expect(connectedButton(page, address)).toBeVisible();
    // Trạng thái mạng nằm trong menu ví.
    await connectedButton(page, address).click();
    await expect(header.getByText("Anvil Localnet")).toBeVisible();
  });

  test("kết nối được giữ lại khi chuyển trang và tải lại trang", async ({ page, address, connectWallet }) => {
    await page.goto("/marketplace");
    await connectWallet();

    await openMyPage(page, address);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Của tôi" })).toBeVisible();

    await page.reload();
    await expect(connectedButton(page, address)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Của tôi" })).toBeVisible();
  });
});
