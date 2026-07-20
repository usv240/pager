import { describe, expect, it } from "vitest";
import { EventLedger } from "../src/event_ledger.js";

describe("EventLedger", () => {
  it("keeps distinct provider events", () => {
    const ledger = new EventLedger();
    ledger.receive("evt-100");
    ledger.receive("evt-101");
    expect(ledger.processedEvents()).toEqual(["evt-100", "evt-101"]);
  });

  it("does not create duplicate fulfillment work for a replay", () => {
    const ledger = new EventLedger();
    ledger.receive("evt-443");
    ledger.receive("evt-443");
    expect(ledger.processedEvents()).toEqual(["evt-443"]);
  });

  it("keeps each event once across repeated deliveries", () => {
    const ledger = new EventLedger();
    for (const eventId of ["evt-200", "evt-201", "evt-200", "evt-202", "evt-201"]) {
      ledger.receive(eventId);
    }
    expect(ledger.processedEvents()).toEqual(["evt-200", "evt-201", "evt-202"]);
  });
});
