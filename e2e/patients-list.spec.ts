import { test, expect } from "@playwright/test";

test.describe("Patients List – Full UI Test (Real DOM Version)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/patients");
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("div.text-card-foreground", { timeout: 20000 });
  });

  test("header, search bar, and count badge render", async ({ page }) => {
    await expect(page.locator("header h1")).toHaveText("Patients");

    const searchInput = page.getByPlaceholder("Search patients...");
    await expect(searchInput).toBeVisible();

    const countBadge = page
      .getByRole("tabpanel", { name: "All Patients" })
      .getByText(/\d+\s+patients/)
      .first();
    await expect(countBadge).toBeVisible();
  });

  test("first patient card renders exactly", async ({ page }) => {
    const firstCard = page.locator("div.text-card-foreground").first();

    await expect(
      firstCard.locator("xpath=../div[contains(@class,'bg-primary')]"),
    ).toHaveText("Labs");

    await expect(firstCard.locator("h3.font-bold")).toContainText("MEERAMBI");

    await expect(firstCard.locator("p.text-xs")).toContainText("MRN: 20251111768");
    await expect(firstCard.locator("p.text-xs")).toContainText("ASP");

    await expect(firstCard.getByText(/Onboarding/i)).toBeVisible();

    await expect(firstCard.locator("span.truncate")).toContainText("RIGHT LUMBAR HERNIA");

    await expect(firstCard.getByText(/Comorbidities/i)).toBeVisible();
    await expect(firstCard.getByText("HTN").first()).toBeVisible();
  });

  test('mid-list card: "VINAY DARA" renders correctly', async ({ page }) => {
    const vinay = page
      .getByText("VINAY DARA")
      .locator("xpath=ancestor::div[contains(@class,'text-card-foreground')]")
      .first();

    await expect(vinay.locator("h3.font-bold")).toHaveText("VINAY DARA");
    await expect(
      vinay.locator("p.text-xs", { hasText: "MRN:" }).first(),
    ).toContainText("MRN: 20251035602");
    await expect(vinay.getByText("PAID")).toBeVisible();
    await expect(vinay.locator("span.truncate")).toContainText("SPLENIC RUPTURE");
  });

  test("search filters correctly", async ({ page }) => {
    const search = page.getByPlaceholder("Search patients...");

    await search.fill("CELLULITIS");

    await expect(page.getByText(/CELLULITIS/i).first()).toBeVisible();

    await search.fill("");
  });

  test("tabs switch correctly", async ({ page }) => {
    const allTab = page.getByRole("tab", { name: "All Patients" });
    const myTab = page.getByRole("tab", { name: "My Patients" });

    await expect(allTab).toBeVisible();
    await expect(myTab).toBeVisible();

    await myTab.click();

    const myPanel = page.locator('[role="tabpanel"][id*="content-my"]');
    await expect(myPanel).toBeVisible();
  });

  test("list & grid toggles work", async ({ page }) => {
    const gridButton = page.getByRole("button", { name: "Grid view" });
    const listButton = page.getByRole("button", { name: "List view" });

    await expect(gridButton).toBeVisible();
    await expect(listButton).toBeVisible();

    await gridButton.click();
    await expect(page.locator("div.grid.grid-cols-2").first()).toBeVisible();

    await listButton.click();
    await expect(page.locator("div.text-card-foreground").first()).toBeVisible();
  });

  test("floating + button is visible", async ({ page }) => {
    await expect(page.locator("button.bg-primary.rounded-full")).toBeVisible();
  });

  test("bottom nav renders correctly", async ({ page }) => {
    const patientsTab = page.locator("a[aria-current='page'] span").first();
    await expect(patientsTab).toHaveText("Patients");
  });
});
