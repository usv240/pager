from replay_service import ReplayService
from settlement_event import SettlementEvent


class ReplayWorker:
    def __init__(self, service: ReplayService):
        self._service = service

    def handle(self, event: SettlementEvent) -> str:
        return self._service.deliver(event)