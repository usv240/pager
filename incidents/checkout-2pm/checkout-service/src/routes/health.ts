import { Router } from "express";

export function createHealthRouter(serviceName: string): Router {
  const router = Router();
  router.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: serviceName,
    });
  });
  return router;
}
