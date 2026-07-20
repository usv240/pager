from claim_ledger import ClaimLedger
from delivery_gateway import RecordingDeliveryGateway


def delivery_matches_claims(ledger: ClaimLedger, gateway: RecordingDeliveryGateway, event_id: str) -> bool:
    return gateway.delivered_event_ids.count(event_id) == 1 and ledger.status(event_id) == "delivered"