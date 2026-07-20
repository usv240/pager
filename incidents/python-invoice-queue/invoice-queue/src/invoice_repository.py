class PendingInvoiceRepository:
    def __init__(self):
        self._pending: list[str] = []

    def contains(self, invoice_id: str) -> bool:
        return invoice_id in self._pending

    def append(self, invoice_id: str) -> None:
        self._pending.append(invoice_id)

    def all(self) -> list[str]:
        return list(self._pending)