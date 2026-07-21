import { expect, test, type Page } from "@playwright/test";

async function reviewAndDecide(page: Page, title: string, decision: "reject" | "apply") {
  const option = page.locator(".workspace-recommendation").filter({ hasText: title });
  await option.getByRole("button", { name: "Review code change" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Current code", { exact: true })).toBeVisible();
  await expect(page.getByText("Proposed code", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: decision === "reject" ? "Reject proposal" : "Apply to workspace" }).click();
}

test.describe("critical learning loop", () => {
  test("learner can inspect, reject unsafe repairs, verify a safe repair, and mint a credential", async ({ page }) => {
    await page.goto("/?play=1&incident=python-inventory-reservation");

    const skipTutorial = page.getByRole("button", { name: "Skip tutorial" });
    await expect(skipTutorial).toBeVisible();
    await skipTutorial.click();
    await expect(page.locator(".workspace-guide-backdrop")).toHaveCount(0);

    await page.getByLabel("Choose incident").selectOption("python-invoice-queue");
    await expect(page).toHaveURL(/incident=python-invoice-queue/);
    await expect(page.getByRole("heading", { name: "The Invoice Queue Retry" })).toBeVisible();
    await page.getByRole("button", { name: /Repair options 3/ }).click();

    await reviewAndDecide(page, "Normalize the invoice identifier", "reject");
    await reviewAndDecide(page, "Sort pending invoices before returning", "reject");
    await reviewAndDecide(page, "Guard duplicate pending work", "apply");

    await page.getByRole("button", { name: "Run verification" }).click();
    const viewCredential = page.getByRole("button", { name: "View credential" });
    await expect(viewCredential).toBeVisible({ timeout: 110_000 });
    await expect(page.getByText("5 acceptance checks", { exact: true })).toBeVisible();
    await viewCredential.click();
    await expect(page).toHaveURL(/\/credential$/);
    await expect(page.getByText("Execution-verified credential", { exact: true })).toBeVisible();
    await expect(page.getByText("Incorrect recommendation rejected", { exact: true })).toBeVisible();
  });
});
