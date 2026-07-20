import unittest

from claim_ledger import ClaimLedger
from delivery_gateway import RecordingDeliveryGateway
from replay_service import ReplayService
from settlement_event import SettlementEvent


class ReplayServiceTests(unittest.TestCase):
    def test_reentrant_replay_creates_one_external_delivery(self):
        claims = ClaimLedger()
        gateway = RecordingDeliveryGateway()
        service = ReplayService(claims, gateway)
        event = SettlementEvent("set-204", 1200)
        gateway.on_first_delivery = lambda: service.deliver(event)

        self.assertEqual(service.deliver(event), "delivered")
        self.assertEqual(gateway.delivered_event_ids, ["set-204"])
        self.assertEqual(claims.status("set-204"), "delivered")

    def test_distinct_events_remain_independent(self):
        claims = ClaimLedger()
        gateway = RecordingDeliveryGateway()
        service = ReplayService(claims, gateway)

        service.deliver(SettlementEvent("set-205", 1400))
        service.deliver(SettlementEvent("set-206", 1600))

        self.assertEqual(gateway.delivered_event_ids, ["set-205", "set-206"])
        self.assertEqual(claims.status("set-205"), "delivered")
        self.assertEqual(claims.status("set-206"), "delivered")