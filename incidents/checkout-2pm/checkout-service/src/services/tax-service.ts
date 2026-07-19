import type { CartLineTotal } from "../domain/cart.js";
import { ValidationError } from "../domain/errors.js";
import { addCents, percentageOfCents } from "../domain/money.js";

export interface TaxRule {
  jurisdiction: string;
  basisPoints: number;
}

export interface TaxLine {
  productId: string;
  taxableAmountCents: number;
  taxCents: number;
}

export interface TaxQuote {
  jurisdiction: string;
  basisPoints: number;
  taxableSubtotalCents: number;
  taxCents: number;
  lines: TaxLine[];
}

export class TaxService {
  private readonly rules = new Map<string, TaxRule>();

  constructor(rules: readonly TaxRule[] = []) {
    for (const rule of rules) {
      this.setRule(rule);
    }
  }

  setRule(rule: TaxRule): TaxRule {
    const jurisdiction = rule.jurisdiction.trim().toUpperCase();
    if (jurisdiction.length !== 2) {
      throw new ValidationError("jurisdiction must be a two-character region code.");
    }
    if (!Number.isSafeInteger(rule.basisPoints) || rule.basisPoints < 0 || rule.basisPoints > 10_000) {
      throw new ValidationError("tax basisPoints must be an integer from 0 through 10000.");
    }
    const stored = { jurisdiction, basisPoints: rule.basisPoints };
    this.rules.set(jurisdiction, stored);
    return { ...stored };
  }

  quote(lines: readonly CartLineTotal[], jurisdiction: string): TaxQuote {
    const normalized = jurisdiction.trim().toUpperCase();
    const rule = this.rules.get(normalized);
    if (!rule) {
      throw new ValidationError(`Tax jurisdiction ${normalized} is not supported.`);
    }
    const taxableLines = lines.filter((line) => line.taxable);
    const lineAmounts = taxableLines.map((line) => line.lineTotalCents);
    const taxableSubtotalCents = addCents(lineAmounts);
    const taxCents = percentageOfCents(taxableSubtotalCents, rule.basisPoints);
    const linesWithTax = taxableLines.map((line) => ({
      productId: line.productId,
      taxableAmountCents: line.lineTotalCents,
      taxCents: percentageOfCents(line.lineTotalCents, rule.basisPoints),
    }));
    const distributedTax = addCents(linesWithTax.map((line) => line.taxCents));
    if (linesWithTax.length > 0 && distributedTax !== taxCents) {
      linesWithTax[linesWithTax.length - 1].taxCents += taxCents - distributedTax;
    }
    return {
      jurisdiction: normalized,
      basisPoints: rule.basisPoints,
      taxableSubtotalCents,
      taxCents,
      lines: linesWithTax,
    };
  }

  listRules(): TaxRule[] {
    return [...this.rules.values()]
      .sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction))
      .map((rule) => ({ ...rule }));
  }
}
