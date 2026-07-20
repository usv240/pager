import unittest

from reservation_book import ReservationBook


class ReservationBookTests(unittest.TestCase):
    def test_preserves_distinct_order_reservations(self):
        book = ReservationBook()
        book.reserve("ord-100")
        book.reserve("ord-101")
        self.assertEqual(book.reserved_orders(), ["ord-100", "ord-101"])

    def test_retry_keeps_one_reservation_for_an_order(self):
        book = ReservationBook()
        book.reserve("ord-102")
        book.reserve("ord-102")
        self.assertEqual(book.reserved_orders(), ["ord-102"])

    def test_many_retries_do_not_consume_extra_inventory(self):
        book = ReservationBook()
        for _ in range(4):
            book.reserve("ord-103")
        self.assertEqual(book.reserved_orders(), ["ord-103"])

    def test_retry_does_not_remove_another_order(self):
        book = ReservationBook()
        book.reserve("ord-104")
        book.reserve("ord-105")
        book.reserve("ord-104")
        self.assertEqual(book.reserved_orders(), ["ord-104", "ord-105"])
