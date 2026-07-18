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
