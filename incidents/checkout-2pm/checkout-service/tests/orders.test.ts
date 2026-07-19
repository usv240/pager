import { expect, test } from "vitest";
import { ClearwaterPayments, getChargesForReference } from "../src/gateway/clearwater-payments.js";
import { OrderRepository } from "../src/repos/order-repository.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { Logger } from "../src/utils/logger.js";
import { createPendingPaymentOrder } from "../src/utils/fixtures.js";

test("processes a checkout payment", async () => {
  const orders = new OrderRepository();
  const order = createPendingPaymentOrder(orders);
  const service = new CheckoutService(orders, new ClearwaterPayments(), new Logger());

  const result = await service.processCheckout(order.id);

  expect(result.order.status).toBe("paid");
  expect(orders.findById(order.id)?.status).toBe("paid");
  expect(getChargesForReference(order.paymentReference)).toHaveLength(1);
});
