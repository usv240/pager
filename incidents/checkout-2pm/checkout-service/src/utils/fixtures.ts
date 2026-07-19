import type { Order } from "../domain/order.js";
import { OrderRepository } from "../repos/order-repository.js";
import { nextId } from "./ids.js";

export function createPendingPaymentOrder(repository: OrderRepository): Order {
  const id = nextId("order");
  return repository.create({
    id,
    cartId: nextId("cart"),
    status: "pending_payment",
    totalCents: 2599,
    currency: "USD",
    paymentReference: `order_${id}`,
  });
}
