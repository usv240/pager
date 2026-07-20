import type { AuthoredFixCandidate } from "./checkout-2pm";

const targetFile = "src/invoice_queue.py";

export const pythonInvoiceQueueCandidates = [
  {
    id: "normalize-invoice-id",
    title: "Normalize the invoice identifier",
    rationale: "Trim incoming invoice IDs before queueing them so retry payload formatting cannot create separate work records for the same invoice.",
    faultTag: "symptom-not-cause",
    targetFile,
    teaching: "Normalization can prevent formatting variants, but two identical retry payloads still append the same normalized ID twice. The duplicate-work invariant remains broken.",
    patch: `class InvoiceQueue:
    def __init__(self):
        self._pending = []

    def enqueue(self, invoice_id: str) -> None:
        self._pending.append(invoice_id.strip())

    def pending(self) -> list[str]:
        return list(self._pending)
`,
  },
  {
    id: "sort-pending-invoices",
    title: "Sort pending invoices before returning",
    rationale: "Sort the pending queue at read time so reconciliation sees a stable order even when retries arrive close together.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Sorting changes presentation, not membership. The same invoice remains queued twice, and it also risks breaking the service's submission-order contract.",
    patch: `class InvoiceQueue:
    def __init__(self):
        self._pending = []

    def enqueue(self, invoice_id: str) -> None:
        self._pending.append(invoice_id)

    def pending(self) -> list[str]:
        return sorted(self._pending)
`,
  },
  {
    id: "deduplicate-pending-invoice",
    title: "Guard duplicate pending work",
    rationale: "Preserve first-in queue order, but only append an invoice when it is not already pending. A repeated retry then joins the existing work item instead of creating another one.",
    faultTag: "verified",
    targetFile,
    teaching: "The queue now records a given invoice ID once while preserving the first submission order. The repeated-retry acceptance check passes.",
    patch: `class InvoiceQueue:
    def __init__(self):
        self._pending = []

    def enqueue(self, invoice_id: str) -> None:
        if invoice_id not in self._pending:
            self._pending.append(invoice_id)

    def pending(self) -> list[str]:
        return list(self._pending)
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];
