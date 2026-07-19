import { Router } from "express";
import type { ServiceConfig } from "../config.js";
import { ValidationError } from "../domain/errors.js";
import type { ServiceContext } from "../utils/fixtures.js";

function readJurisdiction(value: unknown, defaultValue: string): string {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string" || value.trim().length !== 2) {
    throw new ValidationError("taxJurisdiction must be a two-character region code.");
  }
  return value.trim().toUpperCase();
}

export function createOrdersRouter(context: ServiceContext, config: ServiceConfig): Router {
  const router = Router();

  router.post("/carts/:cartId/orders", (req, res) => {
    const cart = context.cartService.getCart(req.params.cartId);
    const jurisdiction = readJurisdiction(req.body?.taxJurisdiction, config.defaultTaxJurisdiction);
    const price = context.pricingService.priceCart(cart, jurisdiction);
    const reservation = context.inventoryService.reserveCart(cart.id, cart.lines);
    const quote = context.orderService.quote(cart, price.discount, price.tax);
    const order = context.orderService.createPendingOrder(quote);
    res.status(201).json({ order, quote, reservationId: reservation.id });
  });

  router.get("/orders/:orderId", (req, res) => {
    res.status(200).json({ order: context.orderService.getOrder(req.params.orderId) });
  });

  router.post("/orders/:orderId/cancel", (req, res) => {
    res.status(200).json({ order: context.orderService.cancelOrder(req.params.orderId) });
  });

  return router;
}
