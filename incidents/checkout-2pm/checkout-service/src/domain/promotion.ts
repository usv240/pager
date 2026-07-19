import { PromotionUnavailableError, ValidationError } from "./errors.js";
import { assertNonNegativeCents, percentageOfCents } from "./money.js";

export interface PromotionWindow {
  startsAt: string;
  endsAt: string;
}

export interface PromotionLimits {
  minimumSubtotalCents: number;
  maximumDiscountCents: number;
}

export interface PercentagePromotion extends PromotionWindow, PromotionLimits {
  code: string;
  kind: "percentage";
  basisPoints: number;
}

export interface FixedPromotion extends PromotionWindow, PromotionLimits {
  code: string;
  kind: "fixed";
  amountCents: number;
}

export type Promotion = PercentagePromotion | FixedPromotion;

export interface PromotionEvaluation {
  promotion: Promotion;
  subtotalCents: number;
  calculatedDiscountCents: number;
  appliedDiscountCents: number;
  discountedSubtotalCents: number;
}

export function normalizePromotionCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 40) {
    throw new ValidationError("promotion code must contain 2 through 40 characters.");
  }
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    throw new ValidationError("promotion code contains unsupported characters.");
  }
  return normalized;
}

export function parsePromotionDate(value: string, field: string): Date {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new ValidationError(`${field} must be an ISO-8601 date.`);
  }
  return date;
}

export function validatePromotionWindow(window: PromotionWindow): PromotionWindow {
  const startsAt = parsePromotionDate(window.startsAt, "startsAt");
  const endsAt = parsePromotionDate(window.endsAt, "endsAt");
  if (startsAt.getTime() >= endsAt.getTime()) {
    throw new ValidationError("promotion startsAt must precede endsAt.");
  }
  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export function validatePromotion(promotion: Promotion): Promotion {
  const code = normalizePromotionCode(promotion.code);
  const window = validatePromotionWindow(promotion);
  const minimumSubtotalCents = assertNonNegativeCents(
    promotion.minimumSubtotalCents,
    "minimumSubtotalCents",
  );
  const maximumDiscountCents = assertNonNegativeCents(
    promotion.maximumDiscountCents,
    "maximumDiscountCents",
  );
  if (promotion.kind === "percentage") {
    if (
      !Number.isSafeInteger(promotion.basisPoints) ||
      promotion.basisPoints < 1 ||
      promotion.basisPoints > 10_000
    ) {
      throw new ValidationError("promotion basisPoints must be an integer from 1 through 10000.");
    }
    return {
      ...promotion,
      ...window,
      code,
      minimumSubtotalCents,
      maximumDiscountCents,
    };
  }
  return {
    ...promotion,
    ...window,
    code,
    amountCents: assertNonNegativeCents(promotion.amountCents, "amountCents"),
    minimumSubtotalCents,
    maximumDiscountCents,
  };
}

export function isPromotionActive(promotion: Promotion, at: Date): boolean {
  const current = at.getTime();
  return (
    current >= parsePromotionDate(promotion.startsAt, "startsAt").getTime() &&
    current <= parsePromotionDate(promotion.endsAt, "endsAt").getTime()
  );
}

export function calculatePromotionDiscount(
  promotion: Promotion,
  subtotalCents: number,
): number {
  assertNonNegativeCents(subtotalCents, "subtotalCents");
  if (promotion.kind === "percentage") {
    return percentageOfCents(subtotalCents, promotion.basisPoints);
  }
  return promotion.amountCents;
}

export function evaluatePromotion(
  promotion: Promotion,
  subtotalCents: number,
  at: Date,
): PromotionEvaluation {
  const validated = validatePromotion(promotion);
  assertNonNegativeCents(subtotalCents, "subtotalCents");
  if (!isPromotionActive(validated, at)) {
    throw new PromotionUnavailableError(`Promotion ${validated.code} is not currently available.`);
  }
  if (subtotalCents < validated.minimumSubtotalCents) {
    throw new PromotionUnavailableError(
      `Promotion ${validated.code} requires a subtotal of ${validated.minimumSubtotalCents} cents.`,
    );
  }
  const calculatedDiscountCents = calculatePromotionDiscount(validated, subtotalCents);
  const appliedDiscountCents = Math.min(
    subtotalCents,
    calculatedDiscountCents,
    validated.maximumDiscountCents,
  );
  return {
    promotion: validated,
    subtotalCents,
    calculatedDiscountCents,
    appliedDiscountCents,
    discountedSubtotalCents: subtotalCents - appliedDiscountCents,
  };
}

export function clonePromotion(promotion: Promotion): Promotion {
  return { ...promotion };
}

export function sortPromotions(promotions: readonly Promotion[]): Promotion[] {
  return promotions
    .map(clonePromotion)
    .sort((left, right) => left.code.localeCompare(right.code));
}
