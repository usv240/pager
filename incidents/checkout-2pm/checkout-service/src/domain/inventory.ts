import { ValidationError } from "./errors.js";

export interface StockRecord {
  productId: string;
  onHand: number;
  reserved: number;
}

export interface ReservationLine {
  productId: string;
  quantity: number;
}

export type ReservationStatus = "active" | "released" | "committed";

export interface InventoryReservation {
  id: string;
  lines: ReservationLine[];
  status: ReservationStatus;
}

export interface AvailabilityRecord {
  productId: string;
  onHand: number;
  reserved: number;
  available: number;
}

export function assertStockQuantity(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer.`);
  }
  return value;
}

export function assertReservationQuantity(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 999) {
    throw new ValidationError("reservation quantity must be an integer from 1 through 999.");
  }
  return value;
}

export function validateStockRecord(record: StockRecord): StockRecord {
  const productId = record.productId.trim();
  if (productId.length === 0) {
    throw new ValidationError("stock productId is required.");
  }
  const onHand = assertStockQuantity(record.onHand, "onHand");
  const reserved = assertStockQuantity(record.reserved, "reserved");
  if (reserved > onHand) {
    throw new ValidationError("reserved quantity cannot exceed onHand quantity.");
  }
  return { productId, onHand, reserved };
}

export function availableQuantity(record: StockRecord): number {
  const validated = validateStockRecord(record);
  return validated.onHand - validated.reserved;
}

export function toAvailability(record: StockRecord): AvailabilityRecord {
  const validated = validateStockRecord(record);
  return {
    ...validated,
    available: availableQuantity(validated),
  };
}

export function normalizeReservationLines(
  lines: readonly ReservationLine[],
): ReservationLine[] {
  if (lines.length === 0) {
    throw new ValidationError("reservation lines are required.");
  }
  const quantities = new Map<string, number>();
  for (const line of lines) {
    const productId = line.productId.trim();
    if (productId.length === 0) {
      throw new ValidationError("reservation productId is required.");
    }
    const quantity = assertReservationQuantity(line.quantity);
    quantities.set(
      productId,
      assertReservationQuantity((quantities.get(productId) ?? 0) + quantity),
    );
  }
  return [...quantities]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

export function cloneReservation(reservation: InventoryReservation): InventoryReservation {
  return {
    ...reservation,
    lines: reservation.lines.map((line) => ({ ...line })),
  };
}

export function validateReservation(reservation: InventoryReservation): InventoryReservation {
  const id = reservation.id.trim();
  if (id.length === 0) {
    throw new ValidationError("reservation id is required.");
  }
  if (!(["active", "released", "committed"] as const).includes(reservation.status)) {
    throw new ValidationError("reservation status is not supported.");
  }
  return {
    id,
    lines: normalizeReservationLines(reservation.lines),
    status: reservation.status,
  };
}

export function reservationQuantity(
  reservation: InventoryReservation,
  productId: string,
): number {
  return reservation.lines
    .filter((line) => line.productId === productId)
    .reduce((total, line) => total + line.quantity, 0);
}

export function totalReservedUnits(reservation: InventoryReservation): number {
  return reservation.lines.reduce((total, line) => total + line.quantity, 0);
}
