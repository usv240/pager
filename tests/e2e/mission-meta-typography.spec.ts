import { expect, test, type Page } from "@playwright/test";

async function typography(page: Page) {
  return page.evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".workspace-mission-meta span");
    const eyebrow = document.querySelector<HTMLElement>(".workspace-recommendation > span");
    if (!badge || !eyebrow) throw new Error("Expected mission metadata and repair option labels.");

    const badgeStyle = getComputedStyle(badge);
    const eyebrowStyle = getComputedStyle(eyebrow);
    return {
      badge: { family: badgeStyle.fontFamily, size: Number.parseFloat(badgeStyle.fontSize), weight: Number.parseInt(badgeStyle.fontWeight, 10) },
      eyebrow: { family: eyebrowStyle.fontFamily, size: Number.parseFloat(eyebrowStyle.fontSize), weight: Number.parseInt(eyebrowStyle.fontWeight, 10) },
    };
  });
}

function expectCompactMonoLabels(result: Awaited<ReturnType<typeof typography>>) {
  expect(result.badge.family).toContain("DM Mono");
  expect(result.eyebrow.family).toContain("DM Mono");
  expect(result.badge.size).toBeGreaterThanOrEqual(9);
  expect(result.badge.size).toBeLessThanOrEqual(11);
  expect(result.eyebrow.size).toBeGreaterThanOrEqual(9);
  expect(result.eyebrow.size).toBeLessThanOrEqual(11);
  expect(result.badge.weight).toBeGreaterThanOrEqual(700);
  expect(result.eyebrow.weight).toBeGreaterThanOrEqual(700);
}

test("mission metadata retains compact mono hierarchy in both themes", async ({ page }) => {
  await page.goto("/?play=1&incident=python-invoice-queue");
  await page.getByRole("button", { name: "Skip tutorial" }).click();
  await page.getByRole("button", { name: /Repair options 3/ }).click();

  expectCompactMonoLabels(await typography(page));

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  expectCompactMonoLabels(await typography(page));
});
