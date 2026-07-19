import {
  CheckoutUnavailableError,
  InvalidOrderTransitionError,
  OrderNotFoundError,
  PaymentGatewayError,
} from "../domain/errors.js";
import type { Order } from "../domain/order.js";
import type { Charge, PaymentGateway } from "../gateway/payment-gateway.js";
import { OrderRepository } from "../repos/order-repository.js";
import type { Logger } from "../utils/logger.js";

export interface CheckoutResult {
  order: Order;
  charge: Charge;
}

export class CheckoutService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly logger: Logger,
  ) {}

  async processCheckout(orderId: string): Promise<CheckoutResult> {
    const order = this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== "pending_payment") {
      throw new CheckoutUnavailableError(orderId, order.status);
    }

    const charge = await this.payments.charge({
      reference: order.paymentReference,
      amountCents: order.totalCents,
      currency: order.currency,
    });

    try {
      const paidOrder = this.orders.transitionStatus(orderId, "pending_payment", "paid");
      return { order: paidOrder, charge };
    } catch (error) {
      if (error instanceof InvalidOrderTransitionError) {
        this.logger.error("payment gateway charge confirmation failed", {
          orderId,
          paymentReference: order.paymentReference,
          provider: "clearwater",
          cause: error.message,
        });
        throw new PaymentGatewayError(
          "Clearwater Payments could not confirm your charge. Please retry.",
          error,
        );
      }
      throw error;
    }
  }
}
