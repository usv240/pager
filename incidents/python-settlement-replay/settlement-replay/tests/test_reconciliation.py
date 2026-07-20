import unittest

from claim_ledger import ClaimLedger
from delivery_gateway import RecordingDeliveryGateway
from reconciliation import delivery_matches_claims
from replay_service import ReplayService
from settlement_event import SettlementEvent


class ReconciliationTests(unittest.TestCase):
    def test_replay_produces_one_delivery_backed_by_one_claim(self):
        claims = ClaimLedger()
        gateway = RecordingDeliveryGateway()
        service = ReplayService(claims, gateway)
        event = SettlementEvent("set-207", 900)
        gateway.on_first_delivery = lambda: service.deliver(event)

        service.deliver(event)

        self.assertTrue(delivery_matches_claims(claims, gateway, "set-207"))