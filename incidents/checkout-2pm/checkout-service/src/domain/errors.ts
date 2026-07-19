import type { OrderStatus } from "./order.js";

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} was not found.`);
    this.name = "OrderNotFoundError";
  }
}

export class CheckoutUnavailableError extends Error {
  constructor(orderId: string, status: OrderStatus) {
    super(`Order ${orderId} cannot be checked out while it is ${status}.`);
    this.name = "CheckoutUnavailableError";
  }
}

export class InvalidOrderTransitionError extends Error {
  constructor(orderId: string, expected: OrderStatus, actual: OrderStatus, next: OrderStatus) {
    super(`Order ${orderId} cannot transition from ${actual} to ${next}; expected ${expected}.`);
    this.name = "InvalidOrderTransitionError";
  }
}

export class PaymentGatewayError extends Error {
  readonly code = "PAYMENT_GATEWAY_ERROR";

  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

export class ValidationError extends Error {
  readonly code = "VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class CartNotFoundError extends Error {
  readonly code = "CART_NOT_FOUND";

  constructor(cartId: string) {
    super(`Cart ${cartId} was not found.`);
    this.name = "CartNotFoundError";
  }
}

export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND";

  constructor(productId: string) {
    super(`Product ${productId} was not found.`);
    this.name = "ProductNotFoundError";
  }
}

export class PromotionNotFoundError extends Error {
  readonly code = "PROMOTION_NOT_FOUND";

  constructor(code: string) {
    super(`Promotion ${code} is not available.`);
    this.name = "PromotionNotFoundError";
  }
}

export class PromotionUnavailableError extends Error {
  readonly code = "PROMOTION_UNAVAILABLE";

  constructor(message: string) {
    super(message);
    this.name = "PromotionUnavailableError";
  }
}

export class InventoryUnavailableError extends Error {
  readonly code = "INVENTORY_UNAVAILABLE";

  constructor(productId: string, requested: number, available: number) {
    super(`Product ${productId} has ${available} units available; ${requested} were requested.`);
    this.name = "InventoryUnavailableError";
  }
}

export class ReservationNotFoundError extends Error {
  readonly code = "RESERVATION_NOT_FOUND";

  constructor(reservationId: string) {
    super(`Reservation ${reservationId} was not found.`);
    this.name = "ReservationNotFoundError";
  }
}
