import type { FixCandidate, StakeholderMessage } from "@/lib/types";
export const mockMessages: StakeholderMessage[] = [
  { id: "pm-1", role: "pm", author: "Maya · PM", body: "Support has three duplicate-charge reports. Can we give them an ETA in 15 minutes?", timestamp: "2:04 PM" },
  { id: "senior-1", role: "senior", author: "Jon · Senior Eng", body: "Before changing gateway retries, what happens when two requests read this order at the same time?", timestamp: "2:06 PM" },
  { id: "pair-1", role: "ai-pair", author: "AI Pair", body: "I found two plausible paths. I’d validate the interleaving before shipping either one.", timestamp: "2:07 PM" }
];
export const mockFixes: FixCandidate[] = [
  { id: "increase-timeout", title: "Increase the gateway timeout", faultTag: "symptom-not-cause", rationale: "The gateway reported a confirmation error after charging. Give the confirmation path more time before treating it as a failure.", patch: "await gateway.charge(order.total, order.paymentToken, { timeout: 10_000 });" },
  { id: "idempotency-key", title: "Use an idempotency key for the charge", faultTag: "partial-fix", rationale: "Attach a stable key to each gateway charge so a retry resolves to the original payment instead of creating another one.", patch: "const charge = await gateway.charge(order.total, order.paymentToken, { idempotencyKey: order.id });" },
  { id: "atomic-payment", title: "Share in-flight checkout work", faultTag: "verified", rationale: "Route concurrent requests for the same order through one in-flight checkout operation before charging the gateway.", patch: "Deduplicate in-flight checkout work before charging." }
];

const originalCheckoutMethod = `  async processCheckout(orderId: string): Promise<CheckoutResult> {
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
  }`;

const verifiedCheckoutMethod = `  private readonly inFlight = new Map<string, Promise<CheckoutResult>>();

  async processCheckout(orderId: string): Promise<CheckoutResult> {
    const existing = this.inFlight.get(orderId);
    if (existing) return existing;

    const checkout = this.processPendingCheckout(orderId);
    this.inFlight.set(orderId, checkout);
    try {
      return await checkout;
    } finally {
      this.inFlight.delete(orderId);
    }
  }

  private async processPendingCheckout(orderId: string): Promise<CheckoutResult> {
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

    const paidOrder = this.orders.transitionStatus(orderId, "pending_payment", "paid");
    return { order: paidOrder, charge };
  }`;

export function applyMockFix(fix: FixCandidate, source: string): string {
  if (fix.id !== "atomic-payment") return source;
  return source.replaceAll("\r\n", "\n").replace(originalCheckoutMethod, verifiedCheckoutMethod);
}
