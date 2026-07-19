import { ValidationError } from "./errors.js";
import { assertNonNegativeCents } from "./money.js";

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  unitPriceCents: number;
  currency: "USD";
  taxable: boolean;
  active: boolean;
  category: string;
}

export interface CatalogProduct extends Product {
  availableQuantity: number;
}

export interface ProductCollection {
  category: string;
  products: Product[];
  minimumPriceCents: number;
  maximumPriceCents: number;
}

export function validateProduct(product: Product): Product {
  if (product.id.trim().length === 0) {
    throw new ValidationError("product id is required.");
  }
  if (product.sku.trim().length === 0) {
    throw new ValidationError("product sku is required.");
  }
  if (product.name.trim().length === 0) {
    throw new ValidationError("product name is required.");
  }
  assertNonNegativeCents(product.unitPriceCents, "unitPriceCents");
  return { ...product };
}

export function isPurchasable(product: Product): boolean {
  return product.active && product.unitPriceCents >= 0;
}

export function toCatalogProduct(product: Product, availableQuantity: number): CatalogProduct {
  if (!Number.isSafeInteger(availableQuantity) || availableQuantity < 0) {
    throw new ValidationError("availableQuantity must be a non-negative integer.");
  }
  return {
    ...product,
    availableQuantity,
  };
}

export function cloneProduct(product: Product): Product {
  return { ...product };
}

export function normalizeSku(sku: string): string {
  const normalized = sku.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,40}$/.test(normalized)) {
    throw new ValidationError("sku must contain 3 through 40 letters, numbers, or hyphens.");
  }
  return normalized;
}

export function groupProductsByCategory(products: readonly Product[]): ProductCollection[] {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const category = product.category.trim().toLowerCase();
    const group = groups.get(category) ?? [];
    group.push(cloneProduct(product));
    groups.set(category, group);
  }
  return [...groups]
    .map(([category, entries]) => {
      const sorted = entries.sort((left, right) => left.name.localeCompare(right.name));
      const prices = sorted.map((product) => product.unitPriceCents);
      return {
        category,
        products: sorted,
        minimumPriceCents: Math.min(...prices),
        maximumPriceCents: Math.max(...prices),
      };
    })
    .sort((left, right) => left.category.localeCompare(right.category));
}

export function productSearchText(product: Product): string {
  return [product.sku, product.name, product.description, product.category]
    .join(" ")
    .toLowerCase();
}

export function matchesProductSearch(product: Product, query: string): boolean {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const searchText = productSearchText(product);
  return terms.every((term) => searchText.includes(term));
}
