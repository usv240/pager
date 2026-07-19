import { assertQuantity, summarizeCart, type Cart, type CartSummary } from "../domain/cart.js";
import { ProductNotFoundError, ValidationError } from "../domain/errors.js";
import { isPurchasable } from "../domain/product.js";
import { CartRepository } from "../repos/cart-repository.js";
import { ProductRepository } from "../repos/product-repository.js";
import { nextId } from "../utils/ids.js";

export class CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly products: ProductRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  createCart(): CartSummary {
    const timestamp = this.now().toISOString();
    const cart = this.carts.create({
      id: nextId("cart"),
      lines: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return summarizeCart(cart);
  }

  getCart(cartId: string): CartSummary {
    return summarizeCart(this.carts.requireById(cartId));
  }

  addItem(cartId: string, productId: string, quantity: number): CartSummary {
    assertQuantity(quantity);
    const cart = this.carts.requireById(cartId);
    const product = this.products.findById(productId);
    if (!product || !isPurchasable(product)) {
      throw new ProductNotFoundError(productId);
    }

    const existing = cart.lines.find((line) => line.productId === productId);
    if (existing) {
      existing.quantity = assertQuantity(existing.quantity + quantity);
    } else {
      cart.lines.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity,
        unitPriceCents: product.unitPriceCents,
        taxable: product.taxable,
      });
    }
    return summarizeCart(this.save(cart));
  }

  updateItem(cartId: string, productId: string, quantity: number): CartSummary {
    assertQuantity(quantity);
    const cart = this.carts.requireById(cartId);
    const line = cart.lines.find((candidate) => candidate.productId === productId);
    if (!line) {
      throw new ProductNotFoundError(productId);
    }
    line.quantity = quantity;
    return summarizeCart(this.save(cart));
  }

  removeItem(cartId: string, productId: string): CartSummary {
    const cart = this.carts.requireById(cartId);
    const nextLines = cart.lines.filter((line) => line.productId !== productId);
    if (nextLines.length === cart.lines.length) {
      throw new ProductNotFoundError(productId);
    }
    cart.lines = nextLines;
    return summarizeCart(this.save(cart));
  }

  applyPromotion(cartId: string, code: string): CartSummary {
    const normalized = code.trim().toUpperCase();
    if (normalized.length === 0 || normalized.length > 40) {
      throw new ValidationError("promotion code must contain 1 through 40 characters.");
    }
    const cart = this.carts.requireById(cartId);
    cart.promotionCode = normalized;
    return summarizeCart(this.save(cart));
  }

  clearPromotion(cartId: string): CartSummary {
    const cart = this.carts.requireById(cartId);
    delete cart.promotionCode;
    return summarizeCart(this.save(cart));
  }

  private save(cart: Cart): Cart {
    cart.updatedAt = this.now().toISOString();
    return this.carts.save(cart);
  }
}
