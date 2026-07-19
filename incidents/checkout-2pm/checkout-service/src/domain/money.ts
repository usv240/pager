import { ValidationError } from "./errors.js";

export type Currency = "USD";

export interface Money {
  amountCents: number;
  currency: Currency;
}

export interface PricedAmount {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: Currency;
}

export function assertCents(value: number, field = "amountCents"): number {
  if (!Number.isSafeInteger(value)) {
    throw new ValidationError(`${field} must be a safe integer.`);
  }
  return value;
}

export function assertNonNegativeCents(value: number, field = "amountCents"): number {
  assertCents(value, field);
  if (value < 0) {
    throw new ValidationError(`${field} must be zero or greater.`);
  }
  return value;
}

export function createMoney(amountCents: number, currency: Currency = "USD"): Money {
  return {
    amountCents: assertNonNegativeCents(amountCents),
    currency,
  };
}

export function addCents(values: readonly number[]): number {
  return values.reduce((total, value) => {
    assertCents(value);
    return assertCents(total + value, "totalCents");
  }, 0);
}

export function subtractCents(amountCents: number, deductionCents: number): number {
  assertNonNegativeCents(amountCents);
  assertNonNegativeCents(deductionCents, "deductionCents");
  return Math.max(0, amountCents - deductionCents);
}

export function multiplyCents(unitPriceCents: number, quantity: number): number {
  assertNonNegativeCents(unitPriceCents, "unitPriceCents");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new ValidationError("quantity must be a non-negative integer.");
  }
  return assertCents(unitPriceCents * quantity, "lineTotalCents");
}

export function percentageOfCents(amountCents: number, basisPoints: number): number {
  assertNonNegativeCents(amountCents);
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new ValidationError("basisPoints must be an integer from 0 through 10000.");
  }
  return Math.round((amountCents * basisPoints) / 10_000);
}

export function allocateCents(amountCents: number, weights: readonly number[]): number[] {
  assertNonNegativeCents(amountCents);
  if (weights.length === 0) {
    return [];
  }
  if (weights.some((weight) => !Number.isSafeInteger(weight) || weight < 0)) {
    throw new ValidationError("allocation weights must be non-negative integers.");
  }
  const weightTotal = addCents(weights);
  if (weightTotal === 0) {
    return weights.map(() => 0);
  }

  const allocations = weights.map((weight) => Math.floor((amountCents * weight) / weightTotal));
  let remainder = amountCents - addCents(allocations);
  const ranked = weights
    .map((weight, index) => ({
      index,
      fraction: ((amountCents * weight) / weightTotal) % 1,
    }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);

  for (const entry of ranked) {
    if (remainder === 0) break;
    allocations[entry.index] += 1;
    remainder -= 1;
  }
  return allocations;
}

export function formatUsd(amountCents: number): string {
  assertCents(amountCents);
  const sign = amountCents < 0 ? "-" : "";
  const absolute = Math.abs(amountCents);
  const dollars = Math.floor(absolute / 100);
  const cents = String(absolute % 100).padStart(2, "0");
  return `${sign}$${dollars}.${cents}`;
}

export function buildPricedAmount(
  subtotalCents: number,
  discountCents: number,
  taxCents: number,
): PricedAmount {
  assertNonNegativeCents(subtotalCents, "subtotalCents");
  assertNonNegativeCents(discountCents, "discountCents");
  assertNonNegativeCents(taxCents, "taxCents");
  const discountedSubtotalCents = subtractCents(subtotalCents, discountCents);
  return {
    subtotalCents,
    discountCents: Math.min(discountCents, subtotalCents),
    taxCents,
    totalCents: addCents([discountedSubtotalCents, taxCents]),
    currency: "USD",
  };
}
