import type { FixCandidate, StakeholderMessage } from "@/lib/types";
export const mockMessages: StakeholderMessage[] = [
  { id: "pm-1", role: "pm", author: "Maya · PM", body: "Support has three duplicate-charge reports. Can we give them an ETA in 15 minutes?", timestamp: "2:04 PM" },
  { id: "senior-1", role: "senior", author: "Jon · Senior Eng", body: "Before changing gateway retries, what happens when two requests read this order at the same time?", timestamp: "2:06 PM" },
  { id: "pair-1", role: "ai-pair", author: "AI Pair", body: "I found two plausible paths. I’d validate the interleaving before shipping either one.", timestamp: "2:07 PM" }
];
export const mockFixes: FixCandidate[] = [
  { id: "increase-timeout", title: "Increase the gateway timeout", faultTag: "symptom-not-cause", rationale: "The alert presents as a gateway error, so a longer timeout looks safe—but it does not make the read/create sequence atomic.", patch: "await gateway.charge(order.total, order.paymentToken, { timeout: 10_000 });" },
  { id: "idempotency-key", title: "Use an idempotency key for the charge", faultTag: "partial-fix", rationale: "This reduces duplicate gateway charges, but without a transaction the payment record can still diverge from the charge result.", patch: "const charge = await gateway.charge(order.total, order.paymentToken, { idempotencyKey: order.id });" },
  { id: "atomic-payment", title: "Claim the payment atomically", faultTag: "verified", rationale: "Move the order claim into a unique, atomic create. Only the request that wins may invoke the gateway; contenders return the existing record.", patch: "const payment = await payments.claimOrFind(order.id);\nif (payment.chargeId) return payment;\nconst charge = await gateway.charge(order.total, order.paymentToken);\nreturn payments.attachCharge(payment.id, charge.id);" }
];
