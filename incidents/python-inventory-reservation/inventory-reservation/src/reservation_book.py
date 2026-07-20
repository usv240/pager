from reservation_ledger import ReservationLedger


class ReservationBook:
    def __init__(self, ledger: ReservationLedger | None = None):
        self._ledger = ledger or ReservationLedger()

    def reserve(self, order_id: str) -> None:
        self._ledger.append(order_id)

    def reserved_orders(self) -> list[str]:
        return self._ledger.orders()