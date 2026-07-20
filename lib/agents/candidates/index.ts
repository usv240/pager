import { checkout2pmCandidates } from "./checkout-2pm";
import { pythonInvoiceQueueCandidates } from "./python-invoice-queue";

export const allAuthoredCandidates = [...checkout2pmCandidates, ...pythonInvoiceQueueCandidates];

export function candidatesForFiles(paths: string[]) {
  return paths.includes("src/invoice_queue.py") ? pythonInvoiceQueueCandidates : checkout2pmCandidates;
}
