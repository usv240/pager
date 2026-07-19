import { PromotionNotFoundError, PromotionUnavailableError, ValidationError } from "../domain/errors.js";
import { assertNonNegativeCents, percentageOfCents } from "../domain/money.js";

export interface PercentagePromotion {
  code: string;
  kind: "percentage";
  basisPoints: number;
  minimumSubtotalCents: number;
  maximumDiscountCents: number;
  startsAt: string;
  endsAt: string;
}

export interface FixedPromotion {
  code: string;
  kind: "fixed";
  amountCents: number;
  minimumSubtotalCents: number;
  maximumDiscountCents: number;
  startsAt: string;
  endsAt: string;
}

export type Promotion = PercentagePromotion | FixedPromotion;

export interface DiscountQuote {
  code?: string;
  subtotalCents: number;
  discountCents: number;
  discountedSubtotalCents: number;
}

export class DiscountService {
  private readonly promotions = new Map<string, Promotion>();

  constructor(promotions: readonly Promotion[] = []) {
    for (const promotion of promotions) {
      this.addPromotion(promotion);
    }
  }

  addPromotion(promotion: Promotion): Promotion {
    const normalized = promotion.code.trim().toUpperCase();
    if (normalized.length === 0) {
      throw new ValidationError("promotion code is required.");
    }
    assertNonNegativeCents(promotion.minimumSubtotalCents, "minimumSubtotalCents");
    assertNonNegativeCents(promotion.maximumDiscountCents, "maximumDiscountCents");
    if (promotion.kind === "fixed") {
      assertNonNegativeCents(promotion.amountCents, "amountCents");
    }
    const stored = { ...promotion, code: normalized };
    this.promotions.set(normalized, stored);
    return { ...stored };
  }

  quote(subtotalCents: number, code: string | undefined, at = new Date()): DiscountQuote {
    assertNonNegativeCents(subtotalCents, "subtotalCents");
    if (!code) {
      return {
        subtotalCents,
        discountCents: 0,
        discountedSubtotalCents: subtotalCents,
      };
    }
    const promotion = this.promotions.get(code.trim().toUpperCase());
    if (!promotion) {
      throw new PromotionNotFoundError(code);
    }
    this.assertAvailable(promotion, subtotalCents, at);
    const calculated =
      promotion.kind === "percentage"
        ? percentageOfCents(subtotalCents, promotion.basisPoints)
        : promotion.amountCents;
    const discountCents = Math.min(
      subtotalCents,
      calculated,
      promotion.maximumDiscountCents,
    );
    return {
      code: promotion.code,
      subtotalCents,
      discountCents,
      discountedSubtotalCents: subtotalCents - discountCents,
    };
  }

  listPromotions(): Promotion[] {
    return [...this.promotions.values()]
      .sort((left, right) => left.code.localeCompare(right.code))
      .map((promotion) => ({ ...promotion }));
  }

  reset(promotions: readonly Promotion[] = []): void {
    this.promotions.clear();
    for (const promotion of promotions) {
      this.addPromotion(promotion);
    }
  }

  private assertAvailable(promotion: Promotion, subtotalCents: number, at: Date): void {
    const current = at.getTime();
    if (current < new Date(promotion.startsAt).getTime() || current > new Date(promotion.endsAt).getTime()) {
      throw new PromotionUnavailableError(`Promotion ${promotion.code} is not currently available.`);
    }
    if (subtotalCents < promotion.minimumSubtotalCents) {
      throw new PromotionUnavailableError(
        `Promotion ${promotion.code} requires a subtotal of ${promotion.minimumSubtotalCents} cents.`,
      );
    }
  }
}
