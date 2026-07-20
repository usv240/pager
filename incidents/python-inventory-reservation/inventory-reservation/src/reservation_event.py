from dataclasses import dataclass


@dataclass(frozen=True)
class ReservationEvent:
    order_id: str
    attempt: int