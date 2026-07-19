import type { FixCandidate } from "../../types";

export type AuthoredFixCandidate = FixCandidate;

const targetFile = "src/services/checkout-service.ts";

export const checkout2pmCandidates = [
  {
    id: "handle-confirmation-failure",
    title: "Handle the gateway confirmation failure",
    rationale:
      "Clearwater has already returned a successful charge, so a strict transition conflict should not turn that payment into a retryable checkout failure. Treat the completed order as confirmation, return the provider receipt, and remove the misleading 502 that sends customers back through checkout.",
    faultTag: "symptom-not-cause",
    targetFile,
    patch: `import {
  CheckoutUnavailableError,
  InvalidOrderTransitionError,
  OrderNotFoundError,
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
        const paidOrder = this.orders.findById(orderId);
        if (!paidOrder) throw new OrderNotFoundError(orderId);
        return { order: paidOrder, charge };
      }
      throw error;
    }
  }
}
`,
  },
  {
    id: "send-clearwater-idempotency-key",
    title: "Send an idempotency key to Clearwater",
    rationale:
      "Give every payment attempt a stable identity derived from the order ID. Sending the same key for every submission of one checkout lets the payment boundary recognize repeat attempts as the same operation while preserving the existing order transition and error handling.",
    faultTag: "partial-fix",
    targetFile,
    patch: `import {
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

    const chargeRequest = {
      reference: order.paymentReference,
      amountCents: order.totalCents,
      currency: order.currency,
      idempotencyKey: \`checkout:\${order.id}\`,
    } as const;
    const charge = await this.payments.charge(chargeRequest);

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
`,
  },
  {
    id: "claim-order-before-charging",
    title: "Claim the order before charging",
    rationale:
      "Establish ownership of the order before creating the external charge. Move the order into `charging`, let duplicate callers join the active checkout, and finalize `charging` to `paid` only after Clearwater succeeds so every caller receives one completed result backed by one charge.",
    faultTag: "verified",
    targetFile,
    patch: `import {
  CheckoutUnavailableError,
  OrderNotFoundError,
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
  private readonly activeCheckouts = new Map<string, Promise<CheckoutResult>>();

  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentGateway,
    private readonly logger: Logger,
  ) {}

  async processCheckout(orderId: string): Promise<CheckoutResult> {
    const activeCheckout = this.activeCheckouts.get(orderId);
    if (activeCheckout) return activeCheckout;

    const checkout = this.completeCheckout(orderId);
    this.activeCheckouts.set(orderId, checkout);

    try {
      return await checkout;
    } finally {
      if (this.activeCheckouts.get(orderId) === checkout) {
        this.activeCheckouts.delete(orderId);
      }
    }
  }

  private async completeCheckout(orderId: string): Promise<CheckoutResult> {
    const order = this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== "pending_payment") {
      throw new CheckoutUnavailableError(orderId, order.status);
    }

    this.orders.transitionStatus(orderId, "pending_payment", "charging");

    const charge = await this.payments.charge({
      reference: order.paymentReference,
      amountCents: order.totalCents,
      currency: order.currency,
    });

    const paidOrder = this.orders.transitionStatus(orderId, "charging", "paid");
    return { order: paidOrder, charge };
  }
}
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];
