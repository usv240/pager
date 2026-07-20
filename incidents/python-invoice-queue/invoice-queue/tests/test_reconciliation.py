import unittest

from invoice_queue import InvoiceQueue
from reconciliation import pending_invoice_ids
from retry_worker import RetryWorker


class ReconciliationTests(unittest.TestCase):
    def test_reconciliation_sees_each_invoice_once_after_retries(self):
        queue = InvoiceQueue()
        worker = RetryWorker(queue)
        for invoice_id in ["inv-300", "inv-301", "inv-300", "inv-302", "inv-301"]:
            worker.retry(invoice_id)
        self.assertEqual(pending_invoice_ids(queue), ["inv-300", "inv-301", "inv-302"])