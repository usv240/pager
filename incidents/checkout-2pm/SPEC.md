# The 2 PM Incident — Target Codebase Generation Spec

## Purpose and non-negotiable outcome

Generate a self-contained, intentionally broken checkout-service repository for the mission named **The 2 PM Incident**. It must feel like a small, credible Node service a developer has just inherited. The single defect is a checkout concurrency bug that can double-charge one order. The defect must remain present in the generated baseline; do not repair, mitigate, or call attention to it anywhere in the target repository.

The repository is the target application only. Its README must read like a normal service README and must not mention Pager, a challenge, an incident exercise, an intentional defect, or any expected solution.

## Runtime and quality constraints

| Requirement | Required value |
| --- | --- |
| Runtime | Node.js 20 |
| Language | TypeScript with `strict: true` |
| HTTP | Express |
| Test runner | Vitest only |
| Persistence | In-memory repositories; resettable test fixtures |
| Dependencies | Pure JavaScript packages only; no native modules |
| External I/O | No network calls, database connections, environment secrets, or external services |
| Installation and test command | `npm install && npm test` works from a clean checkout |
| Test duration | Entire suite completes in under 10 seconds in a WebContainer |
| Size | Approximately 2,500–4,000 lines of non-generated TypeScript, excluding lockfiles |
| Defects | Exactly one intentional functional defect: the checkout check-then-act race described below |

Use money as integer cents everywhere. Do not use floating-point currency values. Seed deterministic catalog, inventory, promotion, and order data. Do not add retries, queues, transactions, idempotency, deduplication, locks, compare-and-swap abstractions, or any hidden serialization around payment processing.

## Service shape

The service owns carts, checkout totals, inventory reservation, order state, and a fake payment-provider adapter. It exposes a small JSON HTTP API suitable for route-level tests, while domain and service tests call modules directly. It is not a full storefront: authentication, a database, webhooks, refunds, and real payment-provider integrations are out of scope.

### Required repository tree

```text
checkout-service/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config.ts
│   ├── domain/
│   │   ├── cart.ts
│   │   ├── money.ts
│   │   ├── order.ts
│   │   ├── product.ts
│   │   └── errors.ts
│   ├── routes/
│   │   ├── carts.ts
│   │   ├── checkout.ts
│   │   ├── orders.ts
│   │   └── health.ts
│   ├── services/
│   │   ├── cart-service.ts
│   │   ├── checkout-service.ts
│   │   ├── discount-service.ts
│   │   ├── inventory-service.ts
│   │   ├── order-service.ts
│   │   └── tax-service.ts
│   ├── repos/
│   │   ├── cart-repository.ts
│   │   ├── inventory-repository.ts
│   │   ├── order-repository.ts
│   │   └── product-repository.ts
│   ├── gateway/
│   │   ├── clearwater-payments.ts
│   │   └── payment-gateway.ts
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── request-id.ts
│   │   └── not-found.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── ids.ts
│   │   └── fixtures.ts
│   └── types/
│       └── express.d.ts
└── tests/
    ├── setup.ts
    ├── carts.test.ts
    ├── discounts.test.ts
    ├── tax.test.ts
    ├── inventory.test.ts
    ├── orders.test.ts
    ├── routes.test.ts
    └── concurrency.test.ts
```

Small supporting files are allowed where needed, but preserve these layers and names. The tree must not contain names such as `race`, `locking`, `mutex`, `idempotency`, `concurrency`, or `fix` outside `tests/concurrency.test.ts`, which is the externally supplied acceptance test name.

### Domain contract

- `OrderStatus` includes exactly `draft`, `pending_payment`, `charging`, `paid`, `cancelled` (the baseline code does not use `charging` during checkout, but it is a valid state in the domain transition map for a legitimate repair).
- An order has an ID, cart ID, status, total in cents, currency `USD`, and a payment reference derived deterministically from the order ID, such as `order_<id>`.
- Valid status transitions include `draft → pending_payment`, `pending_payment → charging`, `pending_payment → paid`, `charging → paid`, and appropriate cancellation transitions. This lets a repair atomically claim the work before charging without changing the domain model.
- `orderRepository.transitionStatus(id, from, to)` is strict and correct: it reads the current order and throws a typed `InvalidOrderTransitionError` if the current status is not exactly `from`; otherwise it mutates the status to `to` and returns the updated order. Do not weaken this helper, silently accept an already-paid order, or make it non-throwing.
- Inventory reservations, pricing, discounts, and tax are correct and independent of payment processing. They must not introduce another observable defect.

## Payment adapter contract

Invent a plausible provider called **Clearwater Payments**. It is a local fake, but its public shape should resemble a thin vendor adapter.

- `charge(input)` resolves successfully every time for valid input after an approximately 15 ms asynchronous delay.
- It never randomly fails and never throws for the generated checkout test inputs.
- It accepts a payment reference, amount in cents, and currency. It must not accept, manufacture, or honor an idempotency key.
- It has no deduplication of any kind. Every call appends a successful charge record to a per-reference in-memory ledger.
- Export a test-only-friendly ledger accessor/reset API, for example `getChargesForReference(reference)` and `resetGatewayLedger()`. These are normal adapter utilities, not comments explaining the incident.
- Do not make the gateway responsible for order status, confirmation, or preventing a second charge.

## The sole planted defect

`CheckoutService.processCheckout(orderId)` must use this exact vulnerable ordering:

1. Fetch the order.
2. Reject unless its status is `pending_payment`.
3. Await `ClearwaterPayments.charge(...)`.
4. Call strict `transitionStatus(orderId, 'pending_payment', 'paid')`.
5. Return a successful checkout result only if that transition succeeds.

The status check and final transition must be separated by the awaited gateway charge. Do not place any order-level claim, mutex, serialization, atomic update, idempotency key, gateway deduplication, or equivalent protection before the charge. The gateway latency is intentionally sufficient for two calls started in the same turn to both complete step 2 before either reaches step 4.

The following is the required behavioral sketch; names may vary only cosmetically:

```ts
async processCheckout(orderId: string): Promise<CheckoutResult> {
  const order = this.orders.findById(orderId);
  if (!order) throw new OrderNotFoundError(orderId);
  if (order.status !== "pending_payment") {
    throw new CheckoutUnavailableError(orderId, order.status);
  }

  const charge = await this.payments.charge({
    reference: order.paymentReference,
    amountCents: order.totalCents,
    currency: order.currency,
  });

  try {
    const paidOrder = this.orders.transitionStatus(orderId, "pending_payment", "paid");
    return { order: paidOrder, charge };
  } catch (error) {
    if (error instanceof InvalidOrderTransitionError) {
      this.logger.error("payment gateway charge confirmation failed", {
        orderId,
        paymentReference: order.paymentReference,
        provider: "clearwater",
        cause: error.message,
      });
      throw new PaymentGatewayError("Clearwater Payments could not confirm your charge. Please retry.", error);
    }
    throw error;
  }
}
```

This wrapping is intentional misdirection. The second caller has already received a successful charge from the provider. Its later strict status transition throws because the first caller has set the order to `paid`; the service then presents that internal confirmation failure as a gateway problem.

No other code path should cause payment-gateway errors under normal test inputs. Do not add a catch that returns success after the confirmation error: that is an authored wrong repair scenario, not baseline behavior.

## HTTP symptoms and error mapping

`POST /api/orders/:orderId/checkout` invokes `processCheckout`. A successful response is HTTP 200 and includes the paid order and the gateway charge ID. For the losing concurrent caller, the error handler must expose the following exact externally observable symptom:

```text
HTTP/1.1 502 Bad Gateway
Content-Type: application/json

{"error":{"code":"PAYMENT_GATEWAY_ERROR","message":"Clearwater Payments could not confirm your charge. Please retry."}}
```

The logger must emit this exact message string for that failure:

```text
payment gateway charge confirmation failed
```

Structured fields may include `orderId`, `paymentReference`, `provider: "clearwater"`, and the underlying transition message. The log must blame the provider in the message/fields and must not name a state conflict, race, locking, duplicate charge, or a prospective remedy.

Map ordinary validation, missing resource, inventory, and invalid order-state errors to sensible 4xx responses. Keep the misleading 502 mapping exclusive to the post-charge transition failure.

## Seeded data and ordinary behavior

Provide a deterministic fixture factory used by tests. Include at least three catalog products with stock, a simple percent-or-fixed promotion, and a tax rule. A primary fixture must create a valid cart and one `pending_payment` order whose total is stable and whose payment reference can be asserted by tests. Keep all fixture creation synchronous and reset every repository and the gateway ledger in `tests/setup.ts`.

The normal endpoints should support enough realistic flows to exercise the service:

- Health check.
- Read catalog/product data.
- Create or update a cart and calculate line totals.
- Apply a valid or invalid promotion.
- Calculate tax and checkout total in cents.
- Read an order.
- Checkout an order.

## Test suite specification

Generate roughly 14–18 ordinary tests across the first six test files. They all pass against the deliberately buggy baseline and must test legitimate behavior, not accidentally serialize or mask the checkout path.

| File | Required coverage | Approx. tests |
| --- | --- | ---: |
| `carts.test.ts` | line additions/updates, cents totals, invalid quantities | 3 |
| `discounts.test.ts` | valid promotion, expired/invalid promotion, discount cap or minimum | 3 |
| `tax.test.ts` | cents rounding and taxable/non-taxable calculation | 2 |
| `inventory.test.ts` | reserve available stock, reject insufficient stock, release/restore behavior | 3 |
| `orders.test.ts` | create/read order and strict valid/invalid state transition behavior | 3 |
| `routes.test.ts` | health route, validation/not-found JSON, successful one-request checkout | 3 |

The route checkout test sends only one checkout request and asserts it reaches `paid` with one successful charge. It must not test concurrent invocation or use an idempotency header.

### `tests/concurrency.test.ts` — required acceptance test

This is the one test that fails on the generated baseline. It must import the service and repositories directly (not issue HTTP requests) so it has no server timing or port dependency. It must:

1. Reset all fixtures and seed one order in `pending_payment`.
2. Start exactly two calls to `processCheckout(orderId)` before awaiting either: `const results = await Promise.allSettled([service.processCheckout(id), service.processCheckout(id)])`.
3. Rely on the shared awaited gateway call and its fixed ~15 ms latency to force both synchronous pre-await status checks to run before either payment continuation. Do not use `setTimeout`, polling, retries, fake clocks, random delays, loops, or sleep-and-hope coordination.
4. Assert both settled results are fulfilled. A rejected result is an internal checkout failure and must fail this test.
5. Assert the Clearwater ledger has exactly one charge for the order payment reference.
6. Assert the final order status is `paid`.

The baseline fails at least assertions 4 and 5: it yields one fulfillment and one `PAYMENT_GATEWAY_ERROR` rejection, while the ledger contains two successful charges. The final status is nevertheless `paid`.

### Fix-triangle acceptance table

The generated test design must distinguish a real repair from a symptom-only patch.

| Candidate implementation | Both calls fulfill | Charges for reference | Final status | Acceptance result |
| --- | ---: | ---: | --- | --- |
| Baseline check → await charge → strict transition | No | 2 | `paid` | Fail |
| Swallow post-charge transition failure / report success | Yes | 2 | `paid` | Fail |
| Atomic claim before charge (`pending_payment → charging`) or a per-order mutex spanning check, charge, and final transition | Yes | 1 | `paid` | Pass |

The concurrency test must assert the success, charge-count, and final-state sides of this triangle. Do not weaken it to only assert `paid`, only assert that the provider error disappeared, or only assert response status. A valid repair may return an already-completed successful result to the second concurrent caller, provided it never performs a second charge and leaves the final status `paid`.

## Realism and concealment requirements

- The README describes setup, scripts, endpoint examples, architecture, and test commands in a neutral service style. It must not mention the hidden test’s expected initial failure.
- Use ordinary production-oriented names such as `CheckoutService`, `OrderRepository`, `ClearwaterPayments`, and `InvalidOrderTransitionError`.
- Do not include comments, TODOs, documentation, test descriptions, fixture names, log text, or identifiers that mention bugs, races, concurrent processing, duplicate charges, locks, mutexes, idempotency, critical sections, or fixes. The sole exception is the mandated filename `tests/concurrency.test.ts`; within it, use neutral test wording such as “processes repeated checkout submissions consistently.”
- The strict transition helper must look like normal defensive domain logic, not suspicious code.
- The fake gateway must look like a conventional local adapter, not a deliberate culprit or solution hint.
- Keep all non-checkout business logic internally coherent. Avoid malformed validation, incorrect arithmetic, flaky tests, accidental shared state between tests, or ambiguous error handling that could be interpreted as a second bug.

## Deliverable checklist

- [ ] A standalone Node 20 TypeScript/Express/Vitest repository matching the required tree and WebContainer constraints.
- [ ] `npm install && npm test` runs without network calls after package installation and completes in under 10 seconds.
- [ ] The target codebase is approximately 2,500–4,000 non-generated TypeScript LOC.
- [ ] All ordinary tests (roughly 14–18) pass on the baseline.
- [ ] `tests/concurrency.test.ts` deterministically fails on the baseline with two provider ledger entries, one rejected checkout, and final `paid` status.
- [ ] The post-charge strict-transition failure logs `payment gateway charge confirmation failed` and returns the exact 502 JSON symptom.
- [ ] `transitionStatus(id, from, to)` is strict and correct; it has not been weakened to make the scenario pass.
- [ ] Clearwater Payments always succeeds after about 15 ms, has no idempotency/deduplication support, and exposes a resettable per-reference ledger for tests.
- [ ] No baseline code sends an idempotency key or otherwise serializes/claims checkout before charging.
- [ ] There is exactly one intentional defect and no textual hint anywhere in the target repository about the defect or its repair.
