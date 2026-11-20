import { parseEther } from "viem";
import { ACCOUNTS, ADDRESSES, SEED, publicClient, walletFor } from "../fixtures/anvil";
import { expect, openMyPage, test } from "../fixtures/anvil.fixture";
import MarketplaceJson from "../../src/abis/Marketplace.json";

test.use({ account: "buyer" });

test.describe("02 · Chợ làng chài & Thủ công biển", () => {
  test("lọc → mở sản phẩm → mua → tiếp theo là gì → xác nhận có hộp thoại → chia 70/20/10 → huy hiệu", async ({
    page,
    address,
    chain,
    connectWallet,
  }) => {
    const sellerBefore = await chain.balanceOf(ACCOUNTS.seller.address);
    const treasuryBefore = await chain.balanceOf(ADDRESSES.communityTreasury);

    await page.goto("/marketplace");
    await connectWallet();

    // Thanh lọc và lưới nằm ngay màn hình đầu; thẻ hiện tên nghệ nhân + làng chài thay cho 0x….
    await expect(page.getByRole("group", { name: "Danh mục" })).toBeVisible();
    const card = page.getByRole("link", { name: new RegExp(SEED.listingName) });
    await expect(card).toBeVisible();
    await expect(card).toContainText(SEED.listingArtisan);
    await expect(card).toContainText(SEED.listingVillage);
    await expect(card).not.toContainText("0x");

    // Danh mục khác ⇒ trống; tìm theo làng chài (không dấu) ⇒ thấy lại.
    await page.getByRole("button", { name: /Tour lặn & Trải nghiệm sinh thái/ }).click();
    await expect(page.getByText("Không có sản phẩm phù hợp")).toBeVisible();
    await page.getByRole("button", { name: "Xoá bộ lọc" }).click();
    await page.getByRole("searchbox", { name: "Tìm kiếm sản phẩm" }).fill("nhon ly");
    await expect(card).toBeVisible();

    await card.click();
    await expect(page.getByRole("heading", { level: 1, name: SEED.listingName })).toBeVisible();

    await page.getByRole("button", { name: /Mua ngay · 0\.01 ETH/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công!" })).toBeVisible();
    // "Đã mua" tới khi listing được đọc lại, rồi "Sản phẩm đã được bán"; luôn bị vô hiệu.
    await expect(page.getByRole("button", { name: /^(Đã mua|Sản phẩm đã được bán)$/ })).toBeDisabled();
    await expect(page.getByText("Tiếp theo là gì?")).toBeVisible();

    // Dòng tiến trình: đã thanh toán, đang chờ nhận hàng.
    const progress = page.getByRole("list", { name: "Tiến trình đơn hàng" });
    await expect(progress).toContainText("Đã thanh toán");
    await expect(progress.locator('[aria-current="step"]')).toContainText("Đã nhận hàng");

    // Giữ tiền: chưa có gì được chuyển cho tới khi người mua xác nhận, và phải qua hộp thoại xác nhận.
    expect(await chain.balanceOf(ACCOUNTS.seller.address)).toBe(sellerBefore);
    await page.getByRole("button", { name: "Đã nhận hàng, giải ngân" }).click();
    const confirm = page.getByRole("dialog", { name: "Xác nhận đã nhận hàng?" });
    await expect(confirm).toContainText("Bạn không thể hoàn tác bước này");
    await confirm.getByRole("button", { name: "Quay lại" }).click();
    await expect(confirm).toBeHidden();
    expect(await chain.balanceOf(ACCOUNTS.seller.address)).toBe(sellerBefore);

    await page.getByRole("button", { name: "Đã nhận hàng, giải ngân" }).click();
    await confirm.getByRole("button", { name: "Xác nhận đã nhận hàng" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã xác nhận nhận hàng!" })).toBeVisible();
    await expect(confirm).toBeHidden();

    // PaymentSplitter: 70% cho nghệ nhân, 20% vào Quỹ bảo tồn biển.
    expect((await chain.balanceOf(ACCOUNTS.seller.address)) - sellerBefore).toBe(parseEther("0.007"));
    expect((await chain.balanceOf(ADDRESSES.communityTreasury)) - treasuryBefore).toBe(parseEther("0.002"));
    await expect(progress).toContainText("Đã giải ngân cho người bán");

    // Huy hiệu ECO_CHECKIN của người mua hiện trong trang Của tôi.
    await openMyPage(page, address);
    await expect(page.getByRole("button", { name: /^Ủng hộ nghệ nhân #1\./ })).toBeVisible();
  });

  test("sản phẩm đã bán: không mua lại được, ẩn khỏi lưới trừ khi bật “Hiện mục đã bán”", async ({ page, connectWallet }) => {
    await page.goto("/marketplace/1");
    await connectWallet();
    await page.getByRole("button", { name: /Mua ngay/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Mua hàng thành công!" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("button", { name: "Sản phẩm đã được bán" })).toBeDisabled();

    await page.goto("/marketplace");
    const card = page.getByRole("link", { name: new RegExp(SEED.listingName) });
    await expect(page.getByText("Chợ đang chờ mẻ hàng đầu tiên")).toBeVisible();
    await page.getByRole("switch", { name: "Hiện mục đã bán" }).click();
    await expect(card).toBeVisible();
    await expect(card).toContainText("Đã bán");
  });

  test("bấm Đăng bán: ví chưa xác thực thấy hướng dẫn đăng ký thay cho form", async ({ page, connectWallet }) => {
    // Anvil tắt xác thực nghệ nhân trong Deploy.s.sol; bật lại để kiểm tra luồng chặn sớm.
    const hash = await walletFor("deployer").writeContract({
      address: ADDRESSES.marketplace,
      abi: MarketplaceJson.abi,
      functionName: "setArtisanVerificationRequired",
      args: [true],
    });
    expect((await publicClient.waitForTransactionReceipt({ hash })).status).toBe("success");

    await page.goto("/marketplace");
    await connectWallet();
    await page.getByRole("button", { name: "Bạn là nghệ nhân? Đăng bán" }).click();
    const dialog = page.getByRole("dialog", { name: "Đăng ký làm nghệ nhân" });
    await expect(dialog).toContainText("Ví này chưa được xác thực nghệ nhân");
    await expect(dialog.getByLabel("Tên sản phẩm")).toHaveCount(0);
  });

  test("bấm Đăng bán: ví hợp lệ thấy form có tên nghệ nhân, làng chài, kênh liên hệ", async ({ page, connectWallet }) => {
    await page.goto("/marketplace");
    await connectWallet();
    await page.getByRole("button", { name: "Bạn là nghệ nhân? Đăng bán" }).click();
    const dialog = page.getByRole("dialog", { name: "Đăng bán sản phẩm" });
    await expect(dialog.getByLabel("Tên sản phẩm")).toBeVisible();
    await expect(dialog.getByLabel("Tên nghệ nhân / ngư dân")).toBeVisible();
    await expect(dialog.getByLabel("Làng chài / địa phương")).toBeVisible();
    await expect(dialog.getByLabel("Kênh liên hệ để hẹn giao hàng")).toBeVisible();
    // Lịch tour chỉ hiện với loại "Tour lặn & Trải nghiệm sinh thái".
    await expect(dialog.getByLabel("Lịch tour")).toHaveCount(0);
    await dialog.getByLabel("Loại sản phẩm").selectOption("2");
    await expect(dialog.getByLabel("Lịch tour")).toBeVisible();
  });
});
