class ReservationLedger:
    def __init__(self):
        self._orders: list[str] = []

    def contains(self, order_id: str) -> bool:
        return order_id in self._orders

    def append(self, order_id: str) -> None:
        self._orders.append(order_id)

    def orders(self) -> list[str]:
        return list(self._orders)