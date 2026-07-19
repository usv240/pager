import { cloneCart, type Cart } from "../domain/cart.js";
import { CartNotFoundError } from "../domain/errors.js";

export class CartRepository {
  private readonly carts = new Map<string, Cart>();

  create(cart: Cart): Cart {
    const stored = cloneCart(cart);
    this.carts.set(stored.id, stored);
    return cloneCart(stored);
  }

  findById(id: string): Cart | undefined {
    const cart = this.carts.get(id);
    return cart ? cloneCart(cart) : undefined;
  }

  requireById(id: string): Cart {
    const cart = this.findById(id);
    if (!cart) {
      throw new CartNotFoundError(id);
    }
    return cart;
  }

  save(cart: Cart): Cart {
    this.requireById(cart.id);
    const stored = cloneCart(cart);
    this.carts.set(stored.id, stored);
    return cloneCart(stored);
  }

  list(): Cart[] {
    return [...this.carts.values()].map(cloneCart);
  }

  reset(): void {
    this.carts.clear();
  }
}
