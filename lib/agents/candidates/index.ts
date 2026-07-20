import { checkout2pmCandidates } from "./checkout-2pm";
import { pythonInvoiceQueueCandidates } from "./python-invoice-queue";
import { pythonInventoryReservationCandidates } from "./python-inventory-reservation";
import { typescriptWebhookReplayCandidates } from "./typescript-webhook-replay";

export const allAuthoredCandidates = [...checkout2pmCandidates, ...pythonInvoiceQueueCandidates, ...pythonInventoryReservationCandidates, ...typescriptWebhookReplayCandidates];

export function candidatesForFiles(paths: string[]) {
  if (paths.includes("src/invoice_queue.py")) return pythonInvoiceQueueCandidates;
  if (paths.includes("src/reservation_book.py")) return pythonInventoryReservationCandidates;
  if (paths.includes("src/event_ledger.ts")) return typescriptWebhookReplayCandidates;
  return checkout2pmCandidates;
}
