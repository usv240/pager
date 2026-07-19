import { ValidationError } from "./errors.js";
import { addCents, multiplyCents } from "./money.js";

export interface CartLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  taxable: boolean;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  promotionCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartLineTotal extends CartLine {
  lineTotalCents: number;
}

export interface CartSummary {
  id: string;
  lines: CartLineTotal[];
  itemCount: number;
  subtotalCents: number;
  promotionCode?: string;
  currency: "USD";
}

export function assertQuantity(quantity: number): number {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new ValidationError("quantity must be an integer from 1 through 99.");
  }
  return quantity;
}

export function lineTotal(line: CartLine): number {
  return multiplyCents(line.unitPriceCents, line.quantity);
}

export function summarizeCart(cart: Cart): CartSummary {
  const lines = cart.lines.map((line) => ({
    ...line,
    lineTotalCents: lineTotal(line),
  }));
  return {
    id: cart.id,
    lines,
    itemCount: cart.lines.reduce((total, line) => total + line.quantity, 0),
    subtotalCents: addCents(lines.map((line) => line.lineTotalCents)),
    promotionCode: cart.promotionCode,
    currency: "USD",
  };
}

export function cloneCart(cart: Cart): Cart {
  return {
    ...cart,
    lines: cart.lines.map((line) => ({ ...line })),
  };
}
