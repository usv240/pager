class InvoiceQueue:
    def __init__(self):
        self._pending = []

    def enqueue(self, invoice_id: str) -> None:
        self._pending.append(invoice_id)

    def pending(self) -> list[str]:
        return list(self._pending)
