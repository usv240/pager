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
    patch: `from invoice_repository import PendingInvoiceRepository


class InvoiceQueue:
    def __init__(self, repository: PendingInvoiceRepository | None = None):
        self._repository = repository or PendingInvoiceRepository()

    def enqueue(self, invoice_id: str) -> None:
        self._repository.append(invoice_id.strip())

    def pending(self) -> list[str]:
        return self._repository.all()
`,
  },
  {
    id: "sort-pending-invoices",
    title: "Sort pending invoices before returning",
    rationale: "Sort the pending queue at read time so reconciliation sees a stable order even when retries arrive close together.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Sorting changes presentation, not membership. The same invoice remains queued twice, and it also breaks the service's submission-order contract.",
    patch: `from invoice_repository import PendingInvoiceRepository


class InvoiceQueue:
    def __init__(self, repository: PendingInvoiceRepository | None = None):
        self._repository = repository or PendingInvoiceRepository()

    def enqueue(self, invoice_id: str) -> None:
        self._repository.append(invoice_id)

    def pending(self) -> list[str]:
        return sorted(self._repository.all())
`,
  },
  {
    id: "deduplicate-pending-invoice",
    title: "Guard duplicate pending work",
    rationale: "Use the pending-work repository to preserve first-in queue order while joining a repeated invoice retry to its existing work item.",
    faultTag: "verified",
    targetFile,
    teaching: "The queue now records a given invoice ID once while preserving first submission order. The worker and reconciliation checks both pass.",
    patch: `from invoice_repository import PendingInvoiceRepository


class InvoiceQueue:
    def __init__(self, repository: PendingInvoiceRepository | None = None):
        self._repository = repository or PendingInvoiceRepository()

    def enqueue(self, invoice_id: str) -> None:
        if not self._repository.contains(invoice_id):
            self._repository.append(invoice_id)

    def pending(self) -> list[str]:
        return self._repository.all()
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];