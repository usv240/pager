from invoice_repository import PendingInvoiceRepository


class InvoiceQueue:
    def __init__(self, repository: PendingInvoiceRepository | None = None):
        self._repository = repository or PendingInvoiceRepository()

    def enqueue(self, invoice_id: str) -> None:
        self._repository.append(invoice_id)

    def pending(self) -> list[str]:
        return self._repository.all()