import type { Incident } from "@/lib/types";

export const mockIncident: Incident = {
  id: "checkout-2pm",
  title: "The 2 PM Incident",
  service: "checkout-service",
  severity: "SEV-1",
  alert: "Duplicate payment attempts are spiking — 12 customers may have been charged twice.",
  timeLimitSeconds: 1200,
  availability: "complete",
  briefing: {
    objective: "Contain duplicate checkout charges by tracing concurrent request behavior.",
    successCriterion: "The checkout suite verifies one charge for concurrent callers.",
    rootCause: "Multiple requests can create charges before the order is claimed.",
    evidence: "The concurrency assertion compares caller outcomes with the payment ledger.",
  },
  activeFile: "src/services/checkout.ts",
  execution: { language: "typescript", runner: "webcontainer-node", testCommand: ["npm", "test"] },
  files: [{
    path: "src/services/checkout.ts",
    content: `export async function submitCheckout(order: Order) {
  const existing = await payments.findByOrderId(order.id);

  if (existing) return existing;

  const charge = await gateway.charge(order.total, order.paymentToken);
  return payments.create({ orderId: order.id, chargeId: charge.id });
}`,
  }],
};
