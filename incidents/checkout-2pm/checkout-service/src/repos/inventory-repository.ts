import { InventoryUnavailableError, ReservationNotFoundError, ValidationError } from "../domain/errors.js";
import { normalizeReservationLines } from "../domain/inventory.js";

export interface StockRecord {
  productId: string;
  onHand: number;
  reserved: number;
}

export interface ReservationLine {
  productId: string;
  quantity: number;
}

export interface InventoryReservation {
  id: string;
  lines: ReservationLine[];
  status: "active" | "released" | "committed";
}

function cloneReservation(reservation: InventoryReservation): InventoryReservation {
  return {
    ...reservation,
    lines: reservation.lines.map((line) => ({ ...line })),
  };
}

export class InventoryRepository {
  private readonly stock = new Map<string, StockRecord>();
  private readonly reservations = new Map<string, InventoryReservation>();

  setStock(productId: string, onHand: number): StockRecord {
    if (!Number.isSafeInteger(onHand) || onHand < 0) {
      throw new ValidationError("onHand must be a non-negative integer.");
    }
    const current = this.stock.get(productId);
    const record: StockRecord = {
      productId,
      onHand,
      reserved: current?.reserved ?? 0,
    };
    if (record.reserved > record.onHand) {
      throw new ValidationError("onHand cannot be lower than the reserved quantity.");
    }
    this.stock.set(productId, record);
    return { ...record };
  }

  findStock(productId: string): StockRecord | undefined {
    const record = this.stock.get(productId);
    return record ? { ...record } : undefined;
  }

  available(productId: string): number {
    const record = this.stock.get(productId);
    return record ? record.onHand - record.reserved : 0;
  }

  reserve(id: string, lines: readonly ReservationLine[]): InventoryReservation {
    const normalizedLines = normalizeReservationLines(lines);
    for (const line of normalizedLines) {
      const available = this.available(line.productId);
      if (available < line.quantity) {
        throw new InventoryUnavailableError(line.productId, line.quantity, available);
      }
    }

    for (const line of normalizedLines) {
      const record = this.stock.get(line.productId)!;
      record.reserved += line.quantity;
    }
    const reservation: InventoryReservation = {
      id,
      lines: normalizedLines.map((line) => ({ ...line })),
      status: "active",
    };
    this.reservations.set(id, reservation);
    return cloneReservation(reservation);
  }

  findReservation(id: string): InventoryReservation | undefined {
    const reservation = this.reservations.get(id);
    return reservation ? cloneReservation(reservation) : undefined;
  }

  release(id: string): InventoryReservation {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new ReservationNotFoundError(id);
    }
    if (reservation.status !== "active") {
      return cloneReservation(reservation);
    }
    for (const line of reservation.lines) {
      const record = this.stock.get(line.productId)!;
      record.reserved -= line.quantity;
    }
    reservation.status = "released";
    return cloneReservation(reservation);
  }

  commit(id: string): InventoryReservation {
    const reservation = this.reservations.get(id);
    if (!reservation) {
      throw new ReservationNotFoundError(id);
    }
    if (reservation.status !== "active") {
      return cloneReservation(reservation);
    }
    for (const line of reservation.lines) {
      const record = this.stock.get(line.productId)!;
      record.reserved -= line.quantity;
      record.onHand -= line.quantity;
    }
    reservation.status = "committed";
    return cloneReservation(reservation);
  }

  listStock(): StockRecord[] {
    return [...this.stock.values()]
      .sort((left, right) => left.productId.localeCompare(right.productId))
      .map((record) => ({ ...record }));
  }

  reset(): void {
    this.stock.clear();
    this.reservations.clear();
  }
}
