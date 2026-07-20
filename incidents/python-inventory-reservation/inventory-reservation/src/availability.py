from reservation_book import ReservationBook


def reserved_order_count(book: ReservationBook) -> int:
    return len(book.reserved_orders())