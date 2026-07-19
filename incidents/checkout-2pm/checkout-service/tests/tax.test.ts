import { describe, expect, test } from "vitest";
import type { CartLineTotal } from "../src/domain/cart.js";
import { TaxService } from "../src/services/tax-service.js";
import { taxRuleSeed } from "../src/utils/fixtures.js";

function line(productId: string, lineTotalCents: number, taxable: boolean): CartLineTotal {
  return {
    productId,
    sku: productId.toUpperCase(),
    name: productId,
    quantity: 1,
    unitPriceCents: lineTotalCents,
    lineTotalCents,
    taxable,
  };
}

describe("tax service", () => {
  test("rounds the jurisdiction tax total to the nearest cent", () => {
    const service = new TaxService(taxRuleSeed);

    const quote = service.quote([line("first", 1299, true), line("second", 1899, true)], "IL");

    expect(quote.taxableSubtotalCents).toBe(3198);
    expect(quote.taxCents).toBe(328);
    expect(quote.lines.reduce((total, entry) => total + entry.taxCents, 0)).toBe(328);
  });

  test("excludes non-taxable products from the calculation", () => {
    const service = new TaxService(taxRuleSeed);

    const quote = service.quote(
      [line("physical", 1899, true), line("stored-value", 2500, false)],
      "CA",
    );

    expect(quote.taxableSubtotalCents).toBe(1899);
    expect(quote.taxCents).toBe(138);
    expect(quote.lines).toHaveLength(1);
    expect(quote.lines[0].productId).toBe("physical");
  });
});
