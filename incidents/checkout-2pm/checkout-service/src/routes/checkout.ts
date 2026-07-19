import { Router } from "express";
import type { ServiceContext } from "../utils/fixtures.js";

export function createCheckoutRouter(context: ServiceContext): Router {
  const router = Router();

  router.post("/orders/:orderId/checkout", async (req, res) => {
    const result = await context.checkoutService.processCheckout(req.params.orderId);
    res.status(200).json({
      order: result.order,
      charge: {
        id: result.charge.id,
        reference: result.charge.reference,
        amountCents: result.charge.amountCents,
        currency: result.charge.currency,
        status: result.charge.status,
      },
    });
  });

  return router;
}
