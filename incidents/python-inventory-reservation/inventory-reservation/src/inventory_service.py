from reservation_book import ReservationBook


class InventoryService:
    def __init__(self, reservations: ReservationBook):
        self._reservations = reservations

    def hold_for_checkout(self, order_id: str) -> None:
        self._reservations.reserve(order_id)