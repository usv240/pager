import type { AuthoredFixCandidate } from "./checkout-2pm";

const targetFile = "src/reservation_book.py";

export const pythonInventoryReservationCandidates = [
  {
    id: "trim-reservation-order-id",
    title: "Normalize the reservation order ID",
    rationale: "Trim order IDs before reserving inventory so payload formatting cannot create two holds for what appears to be the same order.",
    faultTag: "symptom-not-cause",
    targetFile,
    teaching: "Normalization can help with formatting variants, but the exact same order ID is still appended twice on retry. The duplicate-reservation invariant remains broken.",
    patch: `from reservation_ledger import ReservationLedger


class ReservationBook:
    def __init__(self, ledger: ReservationLedger | None = None):
        self._ledger = ledger or ReservationLedger()

    def reserve(self, order_id: str) -> None:
        self._ledger.append(order_id.strip())

    def reserved_orders(self) -> list[str]:
        return self._ledger.orders()
`,
  },
  {
    id: "sort-reservations-before-returning",
    title: "Sort reservations before returning",
    rationale: "Sort the reservation ledger when it is read so operations sees a stable order while retries are arriving.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Sorting changes display order, not ledger membership. The duplicate reservation remains and the workflow loses first-reservation ordering.",
    patch: `from reservation_ledger import ReservationLedger


class ReservationBook:
    def __init__(self, ledger: ReservationLedger | None = None):
        self._ledger = ledger or ReservationLedger()

    def reserve(self, order_id: str) -> None:
        self._ledger.append(order_id)

    def reserved_orders(self) -> list[str]:
        return sorted(self._ledger.orders())
`,
  },
  {
    id: "guard-existing-reservation",
    title: "Keep one reservation per order",
    rationale: "Check the reservation ledger before appending a hold so retries join the existing order while new orders remain independent.",
    faultTag: "verified",
    targetFile,
    teaching: "The ledger now has one entry per order and keeps the original reservation order. Retries no longer consume extra inventory across the full workflow.",
    patch: `from reservation_ledger import ReservationLedger


class ReservationBook:
    def __init__(self, ledger: ReservationLedger | None = None):
        self._ledger = ledger or ReservationLedger()

    def reserve(self, order_id: str) -> None:
        if not self._ledger.contains(order_id):
            self._ledger.append(order_id)

    def reserved_orders(self) -> list[str]:
        return self._ledger.orders()
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];