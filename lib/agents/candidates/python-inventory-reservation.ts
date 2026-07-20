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
    patch: `class ReservationBook:
    def __init__(self):
        self._reservations = []

    def reserve(self, order_id: str) -> None:
        self._reservations.append(order_id.strip())

    def reserved_orders(self) -> list[str]:
        return list(self._reservations)
`,
  },
  {
    id: "sort-reservations-before-returning",
    title: "Sort reservations before returning",
    rationale: "Sort the reservation ledger when it is read so operations sees a stable order while retries are arriving.",
    faultTag: "partial-fix",
    targetFile,
    teaching: "Sorting changes display order, not ledger membership. The duplicate reservation is still present and sorting also violates first-reservation order.",
    patch: `class ReservationBook:
    def __init__(self):
        self._reservations = []

    def reserve(self, order_id: str) -> None:
        self._reservations.append(order_id)

    def reserved_orders(self) -> list[str]:
        return sorted(self._reservations)
`,
  },
  {
    id: "guard-existing-reservation",
    title: "Keep one reservation per order",
    rationale: "Only add an order to the reservation ledger when it is not already present. A retry then joins the existing hold while a new order remains independent.",
    faultTag: "verified",
    targetFile,
    teaching: "The ledger now has one entry per order and keeps the original reservation order. Repeated retries no longer consume extra inventory.",
    patch: `class ReservationBook:
    def __init__(self):
        self._reservations = []

    def reserve(self, order_id: str) -> None:
        if order_id not in self._reservations:
            self._reservations.append(order_id)

    def reserved_orders(self) -> list[str]:
        return list(self._reservations)
`,
  },
] as const satisfies readonly AuthoredFixCandidate[];
