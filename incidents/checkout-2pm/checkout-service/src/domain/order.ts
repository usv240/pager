export const orderStatuses = [
  "draft",
  "pending_payment",
  "charging",
  "paid",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export interface Order {
  id: string;
  cartId: string;
  status: OrderStatus;
  totalCents: number;
  currency: "USD";
  paymentReference: string;
}

export const validOrderTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["charging", "paid", "cancelled"],
  charging: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};
