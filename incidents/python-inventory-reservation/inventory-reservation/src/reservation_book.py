class ReservationBook:
    def __init__(self):
        self._reservations = []

    def reserve(self, order_id: str) -> None:
        self._reservations.append(order_id)

    def reserved_orders(self) -> list[str]:
        return list(self._reservations)
