import type { CartSummary } from "../domain/cart.js";
import { allocateCents, buildPricedAmount, type PricedAmount } from "../domain/money.js";
import type { DiscountQuote } from "./discount-service.js";
import { DiscountService } from "./discount-service.js";
import type { TaxQuote } from "./tax-service.js";
import { TaxService } from "./tax-service.js";

export interface PricedCartLine {
  productId: string;
  quantity: number;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

export interface CartPrice extends PricedAmount {
  cartId: string;
  itemCount: number;
  promotionCode?: string;
  taxJurisdiction: string;
  lines: PricedCartLine[];
  discount: DiscountQuote;
  tax: TaxQuote;
}

export class PricingService {
  constructor(
    private readonly discounts: DiscountService,
    private readonly taxes: TaxService,
  ) {}

  priceCart(cart: CartSummary, jurisdiction: string, at = new Date()): CartPrice {
    const discount = this.discounts.quote(cart.subtotalCents, cart.promotionCode, at);
    const tax = this.taxes.quote(cart.lines, jurisdiction);
    const totals = buildPricedAmount(
      cart.subtotalCents,
      discount.discountCents,
      tax.taxCents,
    );
    const lineSubtotals = cart.lines.map((line) => line.lineTotalCents);
    const lineDiscounts = allocateCents(discount.discountCents, lineSubtotals);
    const taxByProduct = new Map(tax.lines.map((line) => [line.productId, line.taxCents]));
    const lines = cart.lines.map((line, index) => {
      const discountCents = lineDiscounts[index] ?? 0;
      const taxCents = taxByProduct.get(line.productId) ?? 0;
      return {
        productId: line.productId,
        quantity: line.quantity,
        subtotalCents: line.lineTotalCents,
        discountCents,
        taxCents,
        totalCents: line.lineTotalCents - discountCents + taxCents,
      };
    });
    return {
      ...totals,
      cartId: cart.id,
      itemCount: cart.itemCount,
      promotionCode: discount.code,
      taxJurisdiction: tax.jurisdiction,
      lines,
      discount,
      tax,
    };
  }
}
