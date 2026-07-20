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
