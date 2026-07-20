import unittest

from invoice_queue import InvoiceQueue
from retry_worker import RetryWorker


class InvoiceQueueTests(unittest.TestCase):
    def test_preserves_submission_order(self):
        queue = InvoiceQueue()
        queue.enqueue("inv-100")
        queue.enqueue("inv-101")
        self.assertEqual(queue.pending(), ["inv-100", "inv-101"])

    def test_retries_do_not_create_duplicate_work(self):
        queue = InvoiceQueue()
        worker = RetryWorker(queue)
        worker.retry("inv-100")
        worker.retry("inv-100")
        self.assertEqual(queue.pending(), ["inv-100"])

    def test_many_retries_leave_one_pending_invoice(self):
        queue = InvoiceQueue()
        worker = RetryWorker(queue)
        for _ in range(5):
            worker.retry("inv-200")
        self.assertEqual(queue.pending(), ["inv-200"])

    def test_retry_does_not_remove_other_pending_work(self):
        queue = InvoiceQueue()
        queue.enqueue("inv-100")
        queue.enqueue("inv-101")
        RetryWorker(queue).retry("inv-100")
        self.assertEqual(queue.pending(), ["inv-100", "inv-101"])