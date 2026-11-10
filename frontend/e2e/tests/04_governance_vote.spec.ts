import { parseEther } from "viem";
import { ACCOUNTS, ADDRESSES } from "../fixtures/anvil";
import { connectedButton, expect, test } from "../fixtures/anvil.fixture";

const PROJECT = "Phục hồi rừng ngập mặn Cẩm Thanh";
/** Anvil deployment: 1 hour voting period (Deploy.s.sol VOTING_PERIOD_LOCAL). */
const VOTING_PERIOD_S = 3600;

test.describe("04 · Community DAO", () => {
  test.use({ account: "voter" }); // 50 ECO, not delegated yet

  test("kích hoạt quyền vote → tạo đề xuất → vote → time travel → execute → Quỹ giảm", async ({
    page,
    address,
    chain,
    connectWallet,
  }) => {
    const recipient = ACCOUNTS.recipient.address;
    const recipientBefore = await chain.balanceOf(recipient);

    await page.goto("/governance");
    await connectWallet();
    await expect(page.getByText("1 ETH", { exact: true })).toBeVisible(); // seeded treasury

    // ECO counts as votes only after delegate(); it must happen before the proposal snapshot.
    await page.getByRole("button", { name: "⚡ Kích hoạt quyền vote" }).click();
    await expect(page.getByText("✅ Quyền biểu quyết đã kích hoạt.", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "＋ Tạo đề xuất" }).click();
    const dialog = page.getByRole("dialog", { name: "🌱 Đề xuất dự án bảo tồn" });
    await dialog.getByLabel("Tên dự án *").fill(PROJECT);
    await dialog.getByLabel(/^Mô tả \*/).fill("Trồng 2.000 cây đước cùng 30 hộ dân địa phương để bảo vệ bờ sông.");
    await dialog.getByLabel("Số ETH yêu cầu *").fill("0.3");
    await dialog.getByLabel("Địa chỉ ví nhận *").fill(recipient);
    await dialog.getByRole("button", { name: "Gửi đề xuất" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tạo đề xuất thành công!" })).toBeVisible();
    await expect(dialog).toBeHidden();

    const card = page.getByRole("article").filter({ hasText: PROJECT });
    await expect(card).toContainText("Đang bỏ phiếu");
    await card.getByRole("link", { name: "Bỏ phiếu →" }).click();
    await expect(page).toHaveURL(/\/governance\/1$/);

    await page.getByRole("button", { name: "Đồng ý 👍" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bỏ phiếu thành công!" })).toBeVisible();
    await expect(page.getByText(/Bạn đã vote rồi — Đồng ý/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Đồng ý 👍" })).toBeDisabled();
    await expect(page.getByText("👍 50 ECO (100%)")).toBeVisible();

    // Time travel past the deadline; reload so the page reads the new block time at once.
    await chain.increaseTime(VOTING_PERIOD_S + 60);
    await page.reload();
    await expect(page.getByText("Đã thông qua · chờ giải ngân")).toBeVisible();

    // Clicked right after the reload, while wagmi may still be reconnecting the wallet:
    // useContractTx waits for the reconnect instead of opening the connect modal.
    await page.getByRole("button", { name: "💸 Thực thi giải ngân" }).click();
    await expect(connectedButton(page, address)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Đã giải ngân từ Quỹ Cộng đồng!" })).toBeVisible();
    await expect(page.getByText(/^💸\s*Đã giải ngân$/)).toBeVisible(); // status badge
    await expect(page.getByText(/Quỹ Cộng đồng đã giải ngân 0,3 ETH/)).toBeVisible();

    expect(await chain.balanceOf(ADDRESSES.communityTreasury)).toBe(parseEther("0.7"));
    expect((await chain.balanceOf(recipient)) - recipientBefore).toBe(parseEther("0.3"));

    await page.getByRole("link", { name: "← Tất cả đề xuất" }).click();
    const stats = page.getByRole("region", { name: "Thống kê Quỹ Cộng đồng" });
    await expect(stats).toContainText("0,7 ETH");
    await expect(stats).toContainText("0,3 ETH");
    await expect(stats).toContainText("1 lần giải ngân");
  });
});

test.describe("04 · Community DAO — ngưỡng ECO", () => {
  test.use({ account: "buyer" }); // no ECO

  test("ví dưới ngưỡng ECO không tạo được đề xuất", async ({ page, connectWallet }) => {
    await page.goto("/governance");
    await connectWallet();
    await page.getByRole("button", { name: "＋ Tạo đề xuất" }).click();
    const dialog = page.getByRole("dialog", { name: "🌱 Đề xuất dự án bảo tồn" });
    await expect(dialog.getByRole("alert")).toContainText("Cần tối thiểu 1 ECO để tạo đề xuất");
    await expect(dialog.getByRole("button", { name: "Gửi đề xuất" })).toBeDisabled();
  });
});
