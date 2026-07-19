import type { CartSummary } from "../domain/cart.js";
import { OrderNotFoundError, ValidationError } from "../domain/errors.js";
import { buildPricedAmount, type PricedAmount } from "../domain/money.js";
import type { Order } from "../domain/order.js";
import { OrderRepository } from "../repos/order-repository.js";
import type { DiscountQuote } from "./discount-service.js";
import type { TaxQuote } from "./tax-service.js";
import { nextId } from "../utils/ids.js";

export interface OrderQuote extends PricedAmount {
  cartId: string;
  itemCount: number;
  promotionCode?: string;
  taxJurisdiction: string;
}

export class OrderService {
  constructor(private readonly orders: OrderRepository) {}

  quote(cart: CartSummary, discount: DiscountQuote, tax: TaxQuote): OrderQuote {
    if (cart.lines.length === 0) {
      throw new ValidationError("Cart must contain at least one item.");
    }
    const amount = buildPricedAmount(cart.subtotalCents, discount.discountCents, tax.taxCents);
    return {
      ...amount,
      cartId: cart.id,
      itemCount: cart.itemCount,
      promotionCode: discount.code,
      taxJurisdiction: tax.jurisdiction,
    };
  }

  createPendingOrder(quote: OrderQuote): Order {
    const id = nextId("order");
    return this.orders.create({
      id,
      cartId: quote.cartId,
      status: "pending_payment",
      totalCents: quote.totalCents,
      currency: "USD",
      paymentReference: `order_${id}`,
    });
  }

  getOrder(orderId: string): Order {
    const order = this.orders.findById(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    return order;
  }

  cancelOrder(orderId: string): Order {
    const order = this.getOrder(orderId);
    if (order.status === "draft") {
      return this.orders.transitionStatus(orderId, "draft", "cancelled");
    }
    if (order.status === "pending_payment") {
      return this.orders.transitionStatus(orderId, "pending_payment", "cancelled");
    }
    throw new ValidationError(`Order ${orderId} cannot be cancelled while it is ${order.status}.`);
  }
}
