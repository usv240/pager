import express, { type Express } from "express";
import { config as defaultConfig, type ServiceConfig } from "./config.js";
import { createErrorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestId } from "./middleware/request-id.js";
import { createCartsRouter } from "./routes/carts.js";
import { createCheckoutRouter } from "./routes/checkout.js";
import { createHealthRouter } from "./routes/health.js";
import { createOrdersRouter } from "./routes/orders.js";
import { createServiceContext, type ServiceContext } from "./utils/fixtures.js";

export interface AppRuntime {
  app: Express;
  context: ServiceContext;
}

export function createApp(
  context: ServiceContext = createServiceContext(),
  config: ServiceConfig = defaultConfig,
): AppRuntime {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(requestId);
  app.use(createHealthRouter(config.serviceName));
  app.use("/api", createCartsRouter(context));
  app.use("/api", createOrdersRouter(context, config));
  app.use("/api", createCheckoutRouter(context));
  app.use(notFound);
  app.use(createErrorHandler(context.logger));
  return { app, context };
}
