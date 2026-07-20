import type { AuthoredFixCandidate } from "./checkout-2pm";

const targetFile = "src/event_ledger.ts";

export const typescriptWebhookReplayCandidates = [
  {
    id: "lowercase-webhook-event-id",
    title: "Normalize the provider event ID",
    rationale: "Lowercase every provider event ID before recording it so casing differences cannot create a second fulfillment entry.",
    faultTag: "symptom-not-cause",
    targetFile,
    teaching: "The same event ID still enters the ledger twice on replay. Formatting is not the problem the acceptance suite exposes.",
    patch: `export class EventLedger {
  private readonly processed: string[] = [];

  receive(eventId: string): void {
    this.processed.push(eventId.toLowerCase());
  }

  processedEvents(): string[] {
    return [...this.processed];
  }
}
`,
  },
  {
    id: "sort-webhook-events",
    title: "Sort the processed-event ledger",
    rationale: "Sort processed events before exposing the ledger so replay bursts are easier to compare in operations tooling.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Sorting makes the ledger easier to read but leaves both deliveries intact. The replay still starts duplicate work.",
    patch: `export class EventLedger {
  private readonly processed: string[] = [];

  receive(eventId: string): void {
    this.processed.push(eventId);
  }

  processedEvents(): string[] {
    return [...this.processed].sort();
  }
}
`,
  },
  {
    id: "deduplicate-provider-event",
    title: "Record each provider event once",
    rationale: "Treat the provider event ID as the idempotency boundary. If that event is already recorded, do not create another fulfillment entry.",
    faultTag: "verified",
    targetFile,
    teaching: "A replay now returns to the existing ledger entry while new event IDs are still accepted. The acceptance suite sees one processed event per provider event ID.",
    patch: `export class EventLedger {
  private readonly processed: string[] = [];

  receive(eventId: string): void {
    if (!this.processed.includes(eventId)) {
      this.processed.push(eventId);
    }
  }

  processedEvents(): string[] {
    return [...this.processed];
  }
}
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];
