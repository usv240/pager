class ClaimLedger:
    def __init__(self):
        self._claims: dict[str, str] = {}

    def find(self, event_id: str) -> str | None:
        return self._claims.get(event_id)

    def claim(self, event_id: str) -> bool:
        if event_id in self._claims:
            return False
        self._claims[event_id] = "processing"
        return True

    def mark_delivered(self, event_id: str) -> None:
        self._claims[event_id] = "delivered"

    def status(self, event_id: str) -> str | None:
        return self._claims.get(event_id)