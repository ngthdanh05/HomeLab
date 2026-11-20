import { parseEther } from "viem";
import { ACCOUNTS, ADDRESSES } from "../fixtures/anvil";
import { connectedButton, expect, test } from "../fixtures/anvil.fixture";

/** Tên mẫu đề xuất đầu tiên trong src/data/proposalTemplates.ts. */
const PROJECT = "Tài trợ phao neo bảo vệ rạn san hô Hòn Mun";
/** Anvil deployment: 1 hour voting period (Deploy.s.sol VOTING_PERIOD_LOCAL). */
const VOTING_PERIOD_S = 3600;

test.describe("04 · Quỹ bảo tồn biển", () => {
  test.use({ account: "voter" }); // 50 ECO, not delegated yet

  test("3 bước: kích hoạt quyền bỏ phiếu → tạo đề xuất từ mẫu → vote → time travel → execute → Quỹ giảm", async ({
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

    // Khối "Tham gia trong 3 bước": ECO chỉ thành phiếu sau delegate(), phải làm trước snapshot của đề xuất.
    const steps = page.getByRole("region", { name: "Tham gia trong 3 bước" });
    await expect(steps).toContainText("Bạn có 50 ECO.");
    await steps.getByRole("button", { name: "Kích hoạt quyền bỏ phiếu", exact: true }).click();
    await expect(steps.getByText("Quyền biểu quyết đã kích hoạt.", { exact: false })).toBeVisible();

    // Đủ ngưỡng ECO ⇒ "Tạo đề xuất" là nút chính, bấm được.
    const create = page.getByRole("button", { name: "Tạo đề xuất", exact: true });
    await expect(create).toBeEnabled();
    await create.click();
    const dialog = page.getByRole("dialog", { name: "Đề xuất dự án bảo tồn" });
    // Mẫu đề xuất bảo tồn biển điền sẵn tên, mô tả và số ETH.
    await dialog.getByRole("button", { name: PROJECT }).click();
    await expect(dialog.getByLabel("Tên dự án")).toHaveValue(PROJECT);
    await expect(dialog.getByLabel("Mô tả")).toHaveValue(/phao neo cố định/);
    await dialog.getByLabel("Số ETH yêu cầu").fill("0.3");
    await dialog.getByLabel("Địa chỉ ví nhận").fill(recipient);
    await dialog.getByRole("button", { name: "Gửi đề xuất" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tạo đề xuất thành công!" })).toBeVisible();
    await expect(dialog).toBeHidden();

    const card = page.getByRole("article").filter({ hasText: PROJECT });
    await expect(card).toContainText("Đang bỏ phiếu");
    await card.getByRole("link", { name: "Bỏ phiếu", exact: true }).click();
    await expect(page).toHaveURL(/\/governance\/1$/);

    await page.getByRole("button", { name: "Đồng ý", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bỏ phiếu thành công!" })).toBeVisible();
    await expect(page.getByText(/Bạn đã bỏ phiếu rồi — Đồng ý/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Đồng ý", exact: true })).toBeDisabled();
    await expect(page.getByText("50 ECO (100%)")).toBeVisible();

    // Time travel past the deadline; reload so the page reads the new block time at once.
    await chain.increaseTime(VOTING_PERIOD_S + 60);
    await page.reload();
    await expect(page.getByText("Đã thông qua · chờ giải ngân")).toBeVisible();

    // Clicked right after the reload, while wagmi may still be reconnecting the wallet:
    // useContractTx waits for the reconnect instead of opening the connect modal.
    await page.getByRole("button", { name: "Thực thi giải ngân", exact: true }).click();
    await expect(connectedButton(page, address)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Đã giải ngân từ Quỹ bảo tồn biển!" })).toBeVisible();
    await expect(page.getByText(/^Đã giải ngân$/)).toBeVisible(); // status badge
    await expect(page.getByText(/Quỹ bảo tồn biển đã giải ngân 0,3 ETH/)).toBeVisible();

    expect(await chain.balanceOf(ADDRESSES.communityTreasury)).toBe(parseEther("0.7"));
    expect((await chain.balanceOf(recipient)) - recipientBefore).toBe(parseEther("0.3"));

    await page.getByRole("link", { name: "Tất cả đề xuất", exact: true }).click();
    const stats = page.getByRole("region", { name: "Thống kê Quỹ bảo tồn biển" });
    await expect(stats).toContainText("0,7 ETH");
    await expect(stats).toContainText("0,3 ETH");
    await expect(stats).toContainText("1 lần giải ngân");
  });
});

test.describe("04 · Quỹ bảo tồn biển — ngưỡng ECO", () => {
  test.use({ account: "buyer" }); // no ECO

  test("ví dưới ngưỡng ECO: nút Tạo đề xuất bị tắt, hiện số ECO đang có và cách kiếm thêm", async ({ page, connectWallet }) => {
    await page.goto("/governance");
    // Chưa kết nối ví vẫn thấy 3 bước tham gia; thông số kỹ thuật thu gọn trong "Quy tắc bỏ phiếu".
    await expect(page.getByRole("heading", { name: "Tham gia trong 3 bước" })).toBeVisible();
    const rules = page.getByText("Quy tắc bỏ phiếu");
    await expect(rules).toBeVisible();
    await expect(page.getByText(/Số phiếu tối thiểu: tổng phiếu/)).toBeHidden();

    await connectWallet();
    await expect(page.getByRole("button", { name: "Tạo đề xuất", exact: true })).toBeDisabled();
    await expect(page.getByText("Cần 1 ECO để tạo đề xuất · bạn có 0 ECO.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cách kiếm thêm ECO" })).toHaveAttribute("href", "/quests");

    // Chưa có đề xuất nào: gợi ý ý tưởng dự án bảo tồn biển.
    await expect(page.getByRole("heading", { name: "Ý tưởng dự án" })).toBeVisible();
    await expect(page.getByText("Thu gom lưới ma vùng biển ven bờ Cù Lao Chàm")).toBeVisible();

    await rules.click();
    await expect(page.getByText(/Số phiếu tối thiểu: tổng phiếu/)).toBeVisible();
  });
});
