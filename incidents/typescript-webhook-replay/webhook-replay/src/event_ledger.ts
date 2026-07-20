export class EventLedger {
  private readonly processed: string[] = [];

  receive(eventId: string): void {
    this.processed.push(eventId);
  }

  processedEvents(): string[] {
    return [...this.processed];
  }
}
