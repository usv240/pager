from inventory_service import InventoryService
from reservation_event import ReservationEvent


class ReservationRetryHandler:
    def __init__(self, inventory: InventoryService):
        self._inventory = inventory

    def handle(self, event: ReservationEvent) -> None:
        self._inventory.hold_for_checkout(event.order_id)