import type { ErrorRequestHandler } from "express";
import {
  CartNotFoundError,
  CheckoutUnavailableError,
  InventoryUnavailableError,
  InvalidOrderTransitionError,
  OrderNotFoundError,
  PaymentGatewayError,
  ProductNotFoundError,
  PromotionNotFoundError,
  PromotionUnavailableError,
  ReservationNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type { Logger } from "../utils/logger.js";

interface ErrorDescription {
  status: number;
  code: string;
  message: string;
}

function describe(error: unknown): ErrorDescription {
  if (error instanceof PaymentGatewayError) {
    return {
      status: 502,
      code: "PAYMENT_GATEWAY_ERROR",
      message: "Clearwater Payments could not confirm your charge. Please retry.",
    };
  }
  if (error instanceof CartNotFoundError) {
    return { status: 404, code: error.code, message: error.message };
  }
  if (error instanceof ProductNotFoundError) {
    return { status: 404, code: error.code, message: error.message };
  }
  if (error instanceof OrderNotFoundError || (error instanceof Error && error.name === "OrderNotFoundError")) {
    return { status: 404, code: "ORDER_NOT_FOUND", message: error.message };
  }
  if (error instanceof ReservationNotFoundError) {
    return { status: 404, code: error.code, message: error.message };
  }
  if (error instanceof PromotionNotFoundError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof PromotionUnavailableError) {
    return { status: 422, code: error.code, message: error.message };
  }
  if (error instanceof InventoryUnavailableError) {
    return { status: 409, code: error.code, message: error.message };
  }
  if (error instanceof CheckoutUnavailableError) {
    return { status: 409, code: "CHECKOUT_UNAVAILABLE", message: error.message };
  }
  if (error instanceof InvalidOrderTransitionError) {
    return { status: 409, code: "INVALID_ORDER_TRANSITION", message: error.message };
  }
  if (error instanceof ValidationError || error instanceof SyntaxError) {
    return {
      status: 400,
      code: error instanceof ValidationError ? error.code : "INVALID_JSON",
      message: error.message,
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "The checkout service could not complete the request.",
  };
}

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, next): void => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const description = describe(error);
    if (description.status >= 500 && !(error instanceof PaymentGatewayError)) {
      logger.error("request processing failed", {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    res.status(description.status).json({
      error: {
        code: description.code,
        message: description.message,
      },
    });
  };
}
