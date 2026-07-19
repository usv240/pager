# Eval 01 — Candidate A applied

## Scenario

The learner applies **Handle the gateway confirmation failure** to `src/services/checkout-service.ts` and runs the checkout suite.

## Expected judgment

This proposal removes the customer-visible confirmation error, but both concurrent requests still charge Clearwater. The suite must fail only `tests/concurrency.test.ts`; all ordinary tests remain green.

## Executable source of truth

`scripts/verify-candidates.ts`, candidate ID `handle-confirmation-failure`.

## Actual verifier output — 2026-07-19

```text
=== handle-confirmation-failure ===
Expected fault tag: symptom-not-cause
npm ci exit: 0 (4152 ms)
npm test exit: 1 (17439 ms)
Observed failed files: tests/concurrency.test.ts
Ordinary tests: 17/17 passed
Total tests including verifier observation: 19
Settled outcomes: ["fulfilled","fulfilled"]
Clearwater charges: 2
Final order status: paid
Verification: MATCH
```

## Result

The candidate fails exactly as authored: both callers see success, while the ledger still shows two charges for one order.
