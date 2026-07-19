# Checkout Service

Checkout Service is a small HTTP service for cart pricing, inventory reservation, order creation, and payment capture. It uses deterministic in-memory repositories and a local Clearwater Payments adapter, which makes it suitable for development, integration checks, and browser-hosted runtimes without external infrastructure.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Setup

```bash
npm install
npm run typecheck
npm test
```

The service has no database, secret, or third-party API requirement. Catalog, promotion, inventory, and tax data are loaded from the seeded fixture module when the process starts.

## Running the service

```bash
npm run build
npm start
```

The default listener is `http://localhost:3000`. Set `PORT`, `SERVICE_NAME`, or `DEFAULT_TAX_JURISDICTION` to override the corresponding runtime values.

```bash
PORT=4100 DEFAULT_TAX_JURISDICTION=OR npm start
```

## HTTP API

All request and response bodies use JSON. Monetary values are integer cents in USD.

### Health

```http
GET /health
```

```json
{
  "status": "ok",
  "service": "checkout-service"
}
```

### Catalog

```http
GET /api/catalog
```

The response includes active products and their currently available quantities.

### Carts

Create a cart:

```http
POST /api/carts
Content-Type: application/json

{}
```

Add an item:

```http
POST /api/carts/{cartId}/items
Content-Type: application/json

{
  "productId": "ceramic-mug",
  "quantity": 2
}
```

Update an item quantity:

```http
PUT /api/carts/{cartId}/items/{productId}
Content-Type: application/json

{
  "quantity": 3
}
```

Apply a promotion:

```http
PUT /api/carts/{cartId}/promotion
Content-Type: application/json

{
  "code": "WELCOME10"
}
```

### Orders

Create an order from a cart:

```http
POST /api/carts/{cartId}/orders
Content-Type: application/json

{
  "taxJurisdiction": "IL"
}
```

Read an order:

```http
GET /api/orders/{orderId}
```

Submit payment:

```http
POST /api/orders/{orderId}/checkout
Content-Type: application/json

{}
```

A successful payment returns the paid order and the provider charge record.

## Architecture

The code is organized into explicit layers:

- `domain` defines carts, products, orders, money operations, and service errors.
- `repos` owns in-memory persistence and defensive copies at repository boundaries.
- `services` coordinates pricing, promotions, inventory, orders, and payment capture.
- `gateway` contains the Clearwater Payments adapter contract and local implementation.
- `routes` maps the service operations to Express endpoints.
- `middleware` provides request IDs, JSON error responses, and unmatched-route handling.
- `utils/fixtures.ts` builds the deterministic runtime composition used by local startup and tests.

Repository state is scoped to one service context. Creating a fresh context produces a clean catalog, inventory set, payment adapter, logger, and service collection.

## Data conventions

- Currency values use integer cents and `USD`.
- Product quantities are positive integers.
- Promotion codes are normalized to uppercase.
- Tax jurisdictions use two-character uppercase region codes.
- Order and payment references are generated deterministically within a process.
- API errors use `{ "error": { "code": string, "message": string } }`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run build` | Compile TypeScript into `dist` |
| `npm start` | Start the compiled HTTP service |
| `npm run typecheck` | Validate strict TypeScript types without emitting files |
| `npm test` | Run the Vitest suite once |

## Development notes

Tests should construct a new service context for each scenario. The global test setup clears deterministic ID and payment-adapter state after every test. Route tests bind to an ephemeral local port and close the listener during teardown.
