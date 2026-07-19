import { describe, expect, test } from "vitest";
import { PromotionNotFoundError, PromotionUnavailableError } from "../src/domain/errors.js";
import { DiscountService } from "../src/services/discount-service.js";
import { promotionSeed } from "../src/utils/fixtures.js";

describe("discount service", () => {
  test("applies an available percentage promotion", () => {
    const service = new DiscountService(promotionSeed);

    const quote = service.quote(5097, "welcome10", new Date("2026-07-18T12:00:00.000Z"));

    expect(quote).toEqual({
      code: "WELCOME10",
      subtotalCents: 5097,
      discountCents: 510,
      discountedSubtotalCents: 4587,
    });
  });

  test("rejects unknown and unavailable promotions", () => {
    const service = new DiscountService(promotionSeed);

    expect(() => service.quote(5000, "UNKNOWN", new Date("2026-07-18T12:00:00.000Z"))).toThrow(
      PromotionNotFoundError,
    );
    expect(() => service.quote(5000, "SPRING15", new Date("2026-07-18T12:00:00.000Z"))).toThrow(
      PromotionUnavailableError,
    );
  });

  test("enforces minimum subtotals and maximum discounts", () => {
    const service = new DiscountService(promotionSeed);

    expect(() => service.quote(2499, "WELCOME10", new Date("2026-07-18T12:00:00.000Z"))).toThrow(
      "requires a subtotal of 2500 cents",
    );
    expect(service.quote(20_000, "WELCOME10", new Date("2026-07-18T12:00:00.000Z"))).toMatchObject({
      discountCents: 1000,
      discountedSubtotalCents: 19_000,
    });
  });
});
