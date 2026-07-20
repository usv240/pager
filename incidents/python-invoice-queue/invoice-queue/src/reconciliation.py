from invoice_queue import InvoiceQueue


def pending_invoice_ids(queue: InvoiceQueue) -> list[str]:
    return queue.pending()