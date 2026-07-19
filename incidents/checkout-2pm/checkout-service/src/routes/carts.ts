import { Router } from "express";
import { ValidationError } from "../domain/errors.js";
import type { ServiceContext } from "../utils/fixtures.js";

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required.`);
  }
  return value.trim();
}

function readQuantity(value: unknown): number {
  if (typeof value !== "number") {
    throw new ValidationError("quantity must be a number.");
  }
  return value;
}

export function createCartsRouter(context: ServiceContext): Router {
  const router = Router();

  router.get("/catalog", (_req, res) => {
    res.status(200).json(context.catalogService.list());
  });

  router.post("/carts", (_req, res) => {
    res.status(201).json({ cart: context.cartService.createCart() });
  });

  router.get("/carts/:cartId", (req, res) => {
    res.status(200).json({ cart: context.cartService.getCart(req.params.cartId) });
  });

  router.post("/carts/:cartId/items", (req, res) => {
    const productId = readString(req.body?.productId, "productId");
    const quantity = readQuantity(req.body?.quantity);
    const cart = context.cartService.addItem(req.params.cartId, productId, quantity);
    res.status(200).json({ cart });
  });

  router.put("/carts/:cartId/items/:productId", (req, res) => {
    const quantity = readQuantity(req.body?.quantity);
    const cart = context.cartService.updateItem(req.params.cartId, req.params.productId, quantity);
    res.status(200).json({ cart });
  });

  router.delete("/carts/:cartId/items/:productId", (req, res) => {
    const cart = context.cartService.removeItem(req.params.cartId, req.params.productId);
    res.status(200).json({ cart });
  });

  router.put("/carts/:cartId/promotion", (req, res) => {
    const code = readString(req.body?.code, "code");
    const cart = context.cartService.applyPromotion(req.params.cartId, code);
    res.status(200).json({ cart });
  });

  router.delete("/carts/:cartId/promotion", (req, res) => {
    const cart = context.cartService.clearPromotion(req.params.cartId);
    res.status(200).json({ cart });
  });

  return router;
}
