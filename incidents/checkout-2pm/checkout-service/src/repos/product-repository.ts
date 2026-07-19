import { ProductNotFoundError } from "../domain/errors.js";
import type { Product } from "../domain/product.js";
import { validateProduct } from "../domain/product.js";

export class ProductRepository {
  private readonly products = new Map<string, Product>();

  create(product: Product): Product {
    const stored = validateProduct(product);
    this.products.set(stored.id, stored);
    return { ...stored };
  }

  findById(id: string): Product | undefined {
    const product = this.products.get(id);
    return product ? { ...product } : undefined;
  }

  requireById(id: string): Product {
    const product = this.findById(id);
    if (!product) {
      throw new ProductNotFoundError(id);
    }
    return product;
  }

  findBySku(sku: string): Product | undefined {
    const normalized = sku.trim().toUpperCase();
    const product = [...this.products.values()].find((candidate) => candidate.sku === normalized);
    return product ? { ...product } : undefined;
  }

  listActive(): Product[] {
    return [...this.products.values()]
      .filter((product) => product.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((product) => ({ ...product }));
  }

  replace(product: Product): Product {
    this.requireById(product.id);
    return this.create(product);
  }

  reset(): void {
    this.products.clear();
  }
}
