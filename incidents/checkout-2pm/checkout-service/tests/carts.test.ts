import { describe, expect, test } from "vitest";
import { ValidationError } from "../src/domain/errors.js";
import { createServiceContext } from "../src/utils/fixtures.js";

describe("cart service", () => {
  test("adds catalog items and calculates integer-cent totals", () => {
    const context = createServiceContext();
    const cart = context.cartService.createCart();

    context.cartService.addItem(cart.id, "ceramic-mug", 2);
    const result = context.cartService.addItem(cart.id, "linen-notebook", 1);

    expect(result.itemCount).toBe(3);
    expect(result.subtotalCents).toBe(5097);
    expect(result.currency).toBe("USD");
    expect(result.lines).toEqual([
      expect.objectContaining({ productId: "ceramic-mug", quantity: 2, lineTotalCents: 3798 }),
      expect.objectContaining({ productId: "linen-notebook", quantity: 1, lineTotalCents: 1299 }),
    ]);
  });

  test("updates an existing item without changing its captured price", () => {
    const context = createServiceContext();
    const cart = context.cartService.createCart();
    context.cartService.addItem(cart.id, "canvas-tote", 1);

    const result = context.cartService.updateItem(cart.id, "canvas-tote", 3);

    expect(result.itemCount).toBe(3);
    expect(result.subtotalCents).toBe(6597);
    expect(result.lines[0]).toMatchObject({
      productId: "canvas-tote",
      unitPriceCents: 2199,
      quantity: 3,
    });
  });

  test("rejects quantities outside the supported range", () => {
    const context = createServiceContext();
    const cart = context.cartService.createCart();

    expect(() => context.cartService.addItem(cart.id, "ceramic-mug", 0)).toThrow(ValidationError);
    expect(() => context.cartService.addItem(cart.id, "ceramic-mug", 1.5)).toThrow(
      "quantity must be an integer from 1 through 99.",
    );
    expect(context.cartService.getCart(cart.id).lines).toEqual([]);
  });
});
