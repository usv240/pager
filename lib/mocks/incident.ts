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
    objective: "Support is fielding duplicate-charge reports and checkout is returning 502s that point at the payment provider. Find the real cause, judge the AI pair's proposals, and ship only what the verification suite proves.",
    successCriterion: "The checkout suite must show both attempts completing with one Clearwater charge.",
    rootCause: "The checkout flow permits more than one payment before the order status is finalized.",
    evidence: "The acceptance assertion compares both checkout outcomes with the payment ledger.",
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
