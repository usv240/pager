from invoice_queue import InvoiceQueue


class RetryWorker:
    def __init__(self, queue: InvoiceQueue):
        self._queue = queue

    def retry(self, invoice_id: str) -> None:
        self._queue.enqueue(invoice_id)