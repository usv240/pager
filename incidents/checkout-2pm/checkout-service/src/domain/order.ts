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

export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export interface OrderAmounts {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: "USD";
}

export interface OrderSnapshot extends Order {
  lines: OrderLine[];
  amounts: OrderAmounts;
  itemCount: number;
  taxJurisdiction: string;
  promotionCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTransition {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  occurredAt: string;
}

export const validOrderTransitions: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["charging", "paid", "cancelled"],
  charging: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && orderStatuses.includes(value as OrderStatus);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return validOrderTransitions[from].includes(to);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return validOrderTransitions[status].length === 0;
}

export function isPaymentInProgress(status: OrderStatus): boolean {
  return status === "pending_payment" || status === "charging";
}

export function cloneOrder(order: Order): Order {
  return { ...order };
}

export function cloneOrderLine(line: OrderLine): OrderLine {
  return { ...line };
}

export function cloneOrderSnapshot(order: OrderSnapshot): OrderSnapshot {
  return {
    ...order,
    lines: order.lines.map(cloneOrderLine),
    amounts: { ...order.amounts },
  };
}

export function countOrderItems(lines: readonly OrderLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}

export function sumOrderLineAmounts(lines: readonly OrderLine[]): OrderAmounts {
  const subtotalCents = lines.reduce((total, line) => total + line.subtotalCents, 0);
  const discountCents = lines.reduce((total, line) => total + line.discountCents, 0);
  const taxCents = lines.reduce((total, line) => total + line.taxCents, 0);
  const totalCents = lines.reduce((total, line) => total + line.totalCents, 0);
  return {
    subtotalCents,
    discountCents,
    taxCents,
    totalCents,
    currency: "USD",
  };
}

export function createOrderSnapshot(input: {
  order: Order;
  lines: readonly OrderLine[];
  amounts: OrderAmounts;
  taxJurisdiction: string;
  promotionCode?: string;
  at: Date;
}): OrderSnapshot {
  const timestamp = input.at.toISOString();
  return {
    ...input.order,
    lines: input.lines.map(cloneOrderLine),
    amounts: { ...input.amounts },
    itemCount: countOrderItems(input.lines),
    taxJurisdiction: input.taxJurisdiction,
    promotionCode: input.promotionCode,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createOrderTransition(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  at: Date,
): OrderTransition {
  return {
    orderId,
    from,
    to,
    occurredAt: at.toISOString(),
  };
}

export function nextOrderStatuses(status: OrderStatus): OrderStatus[] {
  return [...validOrderTransitions[status]];
}

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_payment":
      return "Pending payment";
    case "charging":
      return "Payment processing";
    case "paid":
      return "Paid";
    case "cancelled":
      return "Cancelled";
  }
}
