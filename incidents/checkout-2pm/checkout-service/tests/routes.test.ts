import type { Server } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import { createApp } from "../src/app.js";
import type { ServiceConfig } from "../src/config.js";
import { getChargesForReference } from "../src/gateway/clearwater-payments.js";
import { createServiceContext, seedCheckoutOrder } from "../src/utils/fixtures.js";

const testConfig: ServiceConfig = {
  port: 0,
  serviceName: "checkout-service",
  defaultTaxJurisdiction: "IL",
};

let server: Server | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

async function start(): Promise<{
  baseUrl: string;
  context: ReturnType<typeof createServiceContext>;
}> {
  const context = createServiceContext();
  const runtime = createApp(context, testConfig);
  server = await new Promise<Server>((resolve, reject) => {
    const candidate = runtime.app.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(candidate);
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not bind to a TCP port.");
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, context };
}

describe("http routes", () => {
  test("reports service health", async () => {
    const { baseUrl } = await start();

    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/^request_/);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "checkout-service",
    });
  });

  test("returns consistent JSON for invalid input and missing routes", async () => {
    const { baseUrl } = await start();
    const cartResponse = await fetch(`${baseUrl}/api/carts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const cartBody = (await cartResponse.json()) as { cart: { id: string } };

    const invalid = await fetch(`${baseUrl}/api/carts/${cartBody.cart.id}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "ceramic-mug", quantity: 0 }),
    });
    const missing = await fetch(`${baseUrl}/api/does-not-exist`);

    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "quantity must be an integer from 1 through 99.",
      },
    });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "No route is registered for GET /api/does-not-exist.",
      },
    });
  });

  test("returns a paid order and provider charge for one checkout request", async () => {
    const { baseUrl, context } = await start();
    const order = seedCheckoutOrder(context);

    const response = await fetch(`${baseUrl}/api/orders/${order.id}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const body = (await response.json()) as {
      order: { status: string };
      charge: { id: string; reference: string; amountCents: number };
    };

    expect(response.status).toBe(200);
    expect(body.order.status).toBe("paid");
    expect(body.charge).toMatchObject({
      id: "cw_1",
      reference: order.paymentReference,
      amountCents: order.totalCents,
    });
    expect(getChargesForReference(order.paymentReference)).toHaveLength(1);
  });
});
