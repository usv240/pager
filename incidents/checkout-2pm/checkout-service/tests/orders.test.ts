import { describe, expect, test } from "vitest";
import { InvalidOrderTransitionError } from "../src/domain/errors.js";
import { ClearwaterPayments, getChargesForReference } from "../src/gateway/clearwater-payments.js";
import { OrderRepository } from "../src/repos/order-repository.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { Logger } from "../src/utils/logger.js";
import { createPendingPaymentOrder } from "../src/utils/fixtures.js";

describe("order processing", () => {
  test("processes a checkout payment", async () => {
    const orders = new OrderRepository();
    const order = createPendingPaymentOrder(orders);
    const service = new CheckoutService(orders, new ClearwaterPayments(), new Logger());

    const result = await service.processCheckout(order.id);

    expect(result.order.status).toBe("paid");
    expect(orders.findById(order.id)?.status).toBe("paid");
    expect(getChargesForReference(order.paymentReference)).toHaveLength(1);
  });

  test("persists a valid status transition", () => {
    const orders = new OrderRepository();
    const order = orders.create({
      id: "order_1",
      cartId: "cart_1",
      status: "draft",
      totalCents: 3200,
      currency: "USD",
      paymentReference: "order_order_1",
    });

    const pending = orders.transitionStatus(order.id, "draft", "pending_payment");

    expect(pending.status).toBe("pending_payment");
    expect(orders.findById(order.id)?.status).toBe("pending_payment");
  });

  test("rejects a transition when the stored status differs", () => {
    const orders = new OrderRepository();
    const order = createPendingPaymentOrder(orders);

    expect(() => orders.transitionStatus(order.id, "draft", "cancelled")).toThrow(
      InvalidOrderTransitionError,
    );
    expect(orders.findById(order.id)?.status).toBe("pending_payment");
  });
});
