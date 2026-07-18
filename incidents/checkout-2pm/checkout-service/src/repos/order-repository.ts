import { InvalidOrderTransitionError, OrderNotFoundError } from "../domain/errors.js";
import type { Order, OrderStatus } from "../domain/order.js";
import { validOrderTransitions } from "../domain/order.js";

export class OrderRepository {
  private readonly orders = new Map<string, Order>();

  create(order: Order): Order {
    const stored = { ...order };
    this.orders.set(stored.id, stored);
    return { ...stored };
  }

  findById(id: string): Order | undefined {
    const order = this.orders.get(id);
    return order ? { ...order } : undefined;
  }

  transitionStatus(id: string, from: OrderStatus, to: OrderStatus): Order {
    const order = this.orders.get(id);
    if (!order) {
      throw new OrderNotFoundError(id);
    }
    if (order.status !== from) {
      throw new InvalidOrderTransitionError(id, from, order.status, to);
    }
    if (!validOrderTransitions[from].includes(to)) {
      throw new InvalidOrderTransitionError(id, from, order.status, to);
    }

    order.status = to;
    return { ...order };
  }

  reset(): void {
    this.orders.clear();
  }
}
