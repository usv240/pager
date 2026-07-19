import { ValidationError } from "./errors.js";
import { addCents, assertNonNegativeCents, percentageOfCents } from "./money.js";

export interface TaxRule {
  jurisdiction: string;
  basisPoints: number;
}

export interface TaxableAmount {
  productId: string;
  amountCents: number;
  taxable: boolean;
}

export interface TaxLine {
  productId: string;
  taxableAmountCents: number;
  taxCents: number;
}

export interface TaxCalculation {
  jurisdiction: string;
  basisPoints: number;
  taxableSubtotalCents: number;
  taxCents: number;
  lines: TaxLine[];
}

export function normalizeJurisdiction(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new ValidationError("jurisdiction must be a two-character region code.");
  }
  return normalized;
}

export function validateTaxRule(rule: TaxRule): TaxRule {
  const jurisdiction = normalizeJurisdiction(rule.jurisdiction);
  if (!Number.isSafeInteger(rule.basisPoints) || rule.basisPoints < 0 || rule.basisPoints > 10_000) {
    throw new ValidationError("tax basisPoints must be an integer from 0 through 10000.");
  }
  return { jurisdiction, basisPoints: rule.basisPoints };
}

export function calculateTax(
  rule: TaxRule,
  amounts: readonly TaxableAmount[],
): TaxCalculation {
  const validated = validateTaxRule(rule);
  const taxable = amounts.filter((amount) => amount.taxable);
  for (const amount of taxable) {
    if (amount.productId.trim().length === 0) {
      throw new ValidationError("tax amount productId is required.");
    }
    assertNonNegativeCents(amount.amountCents, "taxableAmountCents");
  }
  const taxableSubtotalCents = addCents(taxable.map((amount) => amount.amountCents));
  const taxCents = percentageOfCents(taxableSubtotalCents, validated.basisPoints);
  const lines = taxable.map((amount) => ({
    productId: amount.productId,
    taxableAmountCents: amount.amountCents,
    taxCents: percentageOfCents(amount.amountCents, validated.basisPoints),
  }));
  const lineTaxCents = addCents(lines.map((line) => line.taxCents));
  const adjustment = taxCents - lineTaxCents;
  if (lines.length > 0 && adjustment !== 0) {
    lines[lines.length - 1].taxCents += adjustment;
  }
  return {
    jurisdiction: validated.jurisdiction,
    basisPoints: validated.basisPoints,
    taxableSubtotalCents,
    taxCents,
    lines,
  };
}

export function effectiveTaxBasisPoints(calculation: TaxCalculation): number {
  if (calculation.taxableSubtotalCents === 0) return 0;
  return Math.round((calculation.taxCents * 10_000) / calculation.taxableSubtotalCents);
}

export function cloneTaxCalculation(calculation: TaxCalculation): TaxCalculation {
  return {
    ...calculation,
    lines: calculation.lines.map((line) => ({ ...line })),
  };
}

export function sortTaxRules(rules: readonly TaxRule[]): TaxRule[] {
  return rules
    .map(validateTaxRule)
    .sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction));
}
