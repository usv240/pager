import { describe, expect, test } from "vitest";
import { InventoryUnavailableError } from "../src/domain/errors.js";
import { InventoryRepository } from "../src/repos/inventory-repository.js";

describe("inventory repository", () => {
  test("reserves available stock without reducing on-hand units", () => {
    const inventory = new InventoryRepository();
    inventory.setStock("ceramic-mug", 5);

    const reservation = inventory.reserve("reservation_1", [
      { productId: "ceramic-mug", quantity: 2 },
    ]);

    expect(reservation.status).toBe("active");
    expect(inventory.findStock("ceramic-mug")).toEqual({
      productId: "ceramic-mug",
      onHand: 5,
      reserved: 2,
    });
    expect(inventory.available("ceramic-mug")).toBe(3);
  });

  test("rejects a reservation when any requested item is unavailable", () => {
    const inventory = new InventoryRepository();
    inventory.setStock("ceramic-mug", 5);
    inventory.setStock("canvas-tote", 1);

    expect(() =>
      inventory.reserve("reservation_1", [
        { productId: "ceramic-mug", quantity: 2 },
        { productId: "canvas-tote", quantity: 2 },
      ]),
    ).toThrow(InventoryUnavailableError);
    expect(inventory.available("ceramic-mug")).toBe(5);
    expect(inventory.available("canvas-tote")).toBe(1);
  });

  test("restores availability when an active reservation is released", () => {
    const inventory = new InventoryRepository();
    inventory.setStock("linen-notebook", 8);
    const reservation = inventory.reserve("reservation_1", [
      { productId: "linen-notebook", quantity: 3 },
    ]);

    const released = inventory.release(reservation.id);

    expect(released.status).toBe("released");
    expect(inventory.available("linen-notebook")).toBe(8);
    expect(inventory.findStock("linen-notebook")?.reserved).toBe(0);
  });
});
