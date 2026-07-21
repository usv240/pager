import { expect, test } from "@playwright/test";

async function typography(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const badge = document.querySelector<HTMLElement>(".workspace-mission-meta span");
    const eyebrow = document.querySelector<HTMLElement>(".workspace-recommendation > span");
    if (!badge || !eyebrow) throw new Error("Expected mission metadata and repair option labels.");
    const badgeStyle = getComputedStyle(badge);
    const eyebrowStyle = getComputedStyle(eyebrow);
    return {
      badge: { size: badgeStyle.fontSize, weight: badgeStyle.fontWeight },
      eyebrow: { size: eyebrowStyle.fontSize, weight: eyebrowStyle.fontWeight },
    };
  });
}

test("mission metadata keeps its compact mono typography in both themes", async ({ page }) => {
  await page.goto("/?play=1&incident=python-invoice-queue");
  await page.getByRole("button", { name: "Skip tutorial" }).click();
  await page.getByRole("button", { name: /Repair options 3/ }).click();

  expect(await typography(page)).toEqual({
    badge: { size: "9.92px", weight: "700" },
    eyebrow: { size: "9.76px", weight: "800" },
  });

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  expect(await typography(page)).toEqual({
    badge: { size: "9.92px", weight: "700" },
    eyebrow: { size: "9.76px", weight: "800" },
  });
});
