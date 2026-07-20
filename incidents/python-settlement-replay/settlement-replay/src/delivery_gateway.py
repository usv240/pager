from settlement_event import SettlementEvent


class DeliveryGateway:
    def deliver(self, event: SettlementEvent) -> None:
        raise NotImplementedError


class RecordingDeliveryGateway(DeliveryGateway):
    def __init__(self):
        self.delivered_event_ids: list[str] = []
        self.on_first_delivery = None

    def deliver(self, event: SettlementEvent) -> None:
        self.delivered_event_ids.append(event.event_id)
        callback = self.on_first_delivery
        self.on_first_delivery = None
        if callback:
            callback()