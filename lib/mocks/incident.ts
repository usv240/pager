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
  telemetry: {
    impact: "Duplicate payment attempts are under investigation.",
    services: [{ name: "checkout-service", status: "degraded" }, { name: "payment-ledger", status: "healthy" }],
    events: [{ timestamp: "14:00", source: "Alerting", message: "Duplicate payment attempts crossed the threshold." }],
  },
  stakeholderMessages: [
    { id: "mock-pm", role: "pm", author: "Maya - PM", body: "Support needs a containment update before the next customer response.", timestamp: "2:04 PM" },
    { id: "mock-senior", role: "senior", author: "Jon - Senior Eng", body: "What can two concurrent requests both observe before either charge completes?", timestamp: "2:06 PM" },
    { id: "mock-pair", role: "ai-pair", author: "AI Pair", body: "I found several plausible paths. Validate the interleaving before shipping one.", timestamp: "2:07 PM" },
  ],
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
