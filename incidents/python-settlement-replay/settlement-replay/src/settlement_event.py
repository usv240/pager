from dataclasses import dataclass


@dataclass(frozen=True)
class SettlementEvent:
    event_id: str
    amount_cents: int