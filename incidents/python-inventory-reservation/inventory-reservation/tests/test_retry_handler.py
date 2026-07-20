import unittest

from availability import reserved_order_count
from inventory_service import InventoryService
from reservation_book import ReservationBook
from reservation_event import ReservationEvent
from retry_handler import ReservationRetryHandler


class ReservationRetryHandlerTests(unittest.TestCase):
    def test_retry_flow_keeps_one_hold_and_preserves_other_orders(self):
        book = ReservationBook()
        handler = ReservationRetryHandler(InventoryService(book))
        handler.handle(ReservationEvent("ord-200", attempt=1))
        handler.handle(ReservationEvent("ord-201", attempt=1))
        handler.handle(ReservationEvent("ord-200", attempt=2))
        self.assertEqual(book.reserved_orders(), ["ord-200", "ord-201"])
        self.assertEqual(reserved_order_count(book), 2)