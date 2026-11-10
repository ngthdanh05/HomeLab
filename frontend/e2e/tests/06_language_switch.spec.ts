import { expect, test } from "../fixtures/anvil.fixture";

test.describe("06 · Đổi ngôn ngữ", () => {
  test("bấm tiếng Anh → cả trang đổi ngay, giữ khi tải lại và chuyển trang; bấm tiếng Việt → đổi lại", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Kết nối ví" })).toBeVisible();

    await header.getByRole("button", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(header.getByRole("button", { name: "Connect Wallet" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore Circular Eco-Tourism with AI & Three.js");
    await expect(page).toHaveTitle(/Circular & Regenerative/);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore Circular Eco-Tourism with AI & Three.js");

    await page.getByRole("link", { name: "🌍 Carbon" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Measure, reduce and offset your trip's carbon footprint");
    await expect(page.getByText("✈️ Plane (domestic) · 630 km")).toBeVisible();

    await header.getByRole("button", { name: "Tiếng Việt" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đo, giảm và bù đắp dấu chân carbon của chuyến đi");
    await expect(page.getByText("✈️ Máy bay (nội địa) · 630 km")).toBeVisible();
  });
});
