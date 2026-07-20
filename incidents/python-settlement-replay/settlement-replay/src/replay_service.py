from claim_ledger import ClaimLedger
from delivery_gateway import DeliveryGateway
from settlement_event import SettlementEvent


class ReplayService:
    def __init__(self, claims: ClaimLedger, gateway: DeliveryGateway):
        self._claims = claims
        self._gateway = gateway

    def deliver(self, event: SettlementEvent) -> str:
        if self._claims.find(event.event_id):
            return "already-delivered"
        self._gateway.deliver(event)
        self._claims.mark_delivered(event.event_id)
        return "delivered"