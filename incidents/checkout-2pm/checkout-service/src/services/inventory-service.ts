import type { CartLine } from "../domain/cart.js";
import { ValidationError } from "../domain/errors.js";
import {
  InventoryRepository,
  type InventoryReservation,
  type StockRecord,
} from "../repos/inventory-repository.js";
import { nextId } from "../utils/ids.js";

export class InventoryService {
  constructor(private readonly inventory: InventoryRepository) {}

  available(productId: string): number {
    return this.inventory.available(productId);
  }

  listStock(): StockRecord[] {
    return this.inventory.listStock();
  }

  reserveCart(cartId: string, lines: readonly CartLine[]): InventoryReservation {
    if (cartId.trim().length === 0) {
      throw new ValidationError("cartId is required.");
    }
    const quantities = new Map<string, number>();
    for (const line of lines) {
      quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
    }
    return this.inventory.reserve(
      nextId("reservation"),
      [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
    );
  }

  releaseReservation(reservationId: string): InventoryReservation {
    return this.inventory.release(reservationId);
  }

  commitReservation(reservationId: string): InventoryReservation {
    return this.inventory.commit(reservationId);
  }
}
