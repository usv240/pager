import type { CatalogProduct, Product } from "../domain/product.js";
import { isPurchasable, toCatalogProduct } from "../domain/product.js";
import { InventoryRepository } from "../repos/inventory-repository.js";
import { ProductRepository } from "../repos/product-repository.js";

export interface CatalogQuery {
  category?: string;
  search?: string;
  availableOnly?: boolean;
}

export interface CatalogSummary {
  products: CatalogProduct[];
  categories: string[];
  total: number;
}

export class CatalogService {
  constructor(
    private readonly products: ProductRepository,
    private readonly inventory: InventoryRepository,
  ) {}

  getProduct(productId: string): CatalogProduct {
    const product = this.products.requireById(productId);
    return toCatalogProduct(product, this.inventory.available(product.id));
  }

  list(query: CatalogQuery = {}): CatalogSummary {
    const category = query.category?.trim().toLowerCase();
    const search = query.search?.trim().toLowerCase();
    const products = this.products
      .listActive()
      .filter((product) => !category || product.category.toLowerCase() === category)
      .filter((product) => !search || this.matches(product, search))
      .map((product) => toCatalogProduct(product, this.inventory.available(product.id)))
      .filter((product) => !query.availableOnly || product.availableQuantity > 0);
    return {
      products,
      categories: [...new Set(products.map((product) => product.category))].sort(),
      total: products.length,
    };
  }

  categories(): string[] {
    return [...new Set(this.products.listActive().map((product) => product.category))].sort();
  }

  purchasable(productId: string, quantity: number): boolean {
    const product = this.products.findById(productId);
    return Boolean(
      product &&
        isPurchasable(product) &&
        Number.isSafeInteger(quantity) &&
        quantity > 0 &&
        this.inventory.available(productId) >= quantity,
    );
  }

  private matches(product: Product, search: string): boolean {
    return [product.name, product.description, product.sku, product.category]
      .some((value) => value.toLowerCase().includes(search));
  }
}
