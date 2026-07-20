import type { AuthoredFixCandidate } from "./checkout-2pm";

const targetFile = "src/replay_service.py";

export const pythonSettlementReplayCandidates = [
  {
    id: "normalize-settlement-id",
    title: "Normalize the settlement identifier",
    rationale: "Normalize settlement IDs before delivery so payload formatting cannot create two downstream records for one settlement.",
    faultTag: "symptom-not-cause",
    targetFile,
    teaching: "The replay uses the exact same event ID in both calls. Formatting is not the race; delivery still happens before the claim is durable.",
    patch: `from claim_ledger import ClaimLedger
from delivery_gateway import DeliveryGateway
from settlement_event import SettlementEvent


class ReplayService:
    def __init__(self, claims: ClaimLedger, gateway: DeliveryGateway):
        self._claims = claims
        self._gateway = gateway

    def deliver(self, event: SettlementEvent) -> str:
        event_id = event.event_id.strip()
        if self._claims.find(event_id):
            return "already-delivered"
        self._gateway.deliver(event)
        self._claims.mark_delivered(event_id)
        return "delivered"
`,
  },
  {
    id: "catch-reentrant-delivery",
    title: "Treat a nested delivery as already delivered",
    rationale: "Return a successful status if delivery is re-entered so the replay worker does not surface a second failure.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Changing the response after delivery cannot undo an external call. The nested replay still reaches the gateway before any claim is recorded.",
    patch: `from claim_ledger import ClaimLedger
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
        return "already-delivered"
`,
  },
  {
    id: "claim-before-delivery",
    title: "Claim the settlement before delivery",
    rationale: "Create the durable processing claim before the external delivery. A replay that arrives during delivery then joins the existing claim instead of calling the gateway again.",
    faultTag: "verified",
    targetFile,
    teaching: "The claim is now visible before the external side effect. Re-entrant calls return without a second delivery while independent settlement events still proceed.",
    patch: `from claim_ledger import ClaimLedger
from delivery_gateway import DeliveryGateway
from settlement_event import SettlementEvent


class ReplayService:
    def __init__(self, claims: ClaimLedger, gateway: DeliveryGateway):
        self._claims = claims
        self._gateway = gateway

    def deliver(self, event: SettlementEvent) -> str:
        if not self._claims.claim(event.event_id):
            return "already-delivered"
        self._gateway.deliver(event)
        self._claims.mark_delivered(event.event_id)
        return "delivered"
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];