import unittest

from invoice_queue import InvoiceQueue


class InvoiceQueueTests(unittest.TestCase):
    def test_preserves_submission_order(self):
        queue = InvoiceQueue()
        queue.enqueue("inv-100")
        queue.enqueue("inv-101")
        self.assertEqual(queue.pending(), ["inv-100", "inv-101"])

    def test_retries_do_not_create_duplicate_work(self):
        queue = InvoiceQueue()
        queue.enqueue("inv-100")
        queue.enqueue("inv-100")
        self.assertEqual(queue.pending(), ["inv-100"])
