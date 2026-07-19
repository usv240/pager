import { expect, test } from "vitest";
import { ClearwaterPayments, getChargesForReference } from "../src/gateway/clearwater-payments.js";
import { OrderRepository } from "../src/repos/order-repository.js";
import { CheckoutService } from "../src/services/checkout-service.js";
import { Logger } from "../src/utils/logger.js";
import { createPendingPaymentOrder } from "../src/utils/fixtures.js";

test("processes repeated checkout submissions consistently", async () => {
  const orders = new OrderRepository();
  const order = createPendingPaymentOrder(orders);
  const service = new CheckoutService(orders, new ClearwaterPayments(), new Logger());

  const results = await Promise.allSettled([
    service.processCheckout(order.id),
    service.processCheckout(order.id),
  ]);
  const outcomes = results.map((result) =>
    result.status === "fulfilled"
      ? "fulfilled"
      : `rejected:${(result.reason as { code?: string }).code ?? "UNKNOWN"}`,
  );

  expect([
    outcomes,
    getChargesForReference(order.paymentReference).length,
    orders.findById(order.id)?.status,
  ]).toEqual([["fulfilled", "fulfilled"], 1, "paid"]);
});
