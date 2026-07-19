# Eval 02 — Candidate B applied

## Scenario

The learner applies **Send an idempotency key to Clearwater** to `src/services/checkout-service.ts` and runs the checkout suite.

## Expected judgment

Clearwater has no idempotency contract, so the extra request property does not deduplicate either charge. The suite must fail only `tests/concurrency.test.ts`; all ordinary tests remain green.

## Executable source of truth

`scripts/verify-candidates.ts`, candidate ID `send-clearwater-idempotency-key`.

## Actual verifier output — 2026-07-19

```text
=== send-clearwater-idempotency-key ===
Expected fault tag: partial-fix
npm ci exit: 0 (5146 ms)
npm test exit: 1 (12669 ms)
Observed failed files: tests/concurrency.test.ts
Ordinary tests: 17/17 passed
Total tests including verifier observation: 19
Settled outcomes: ["fulfilled","rejected:PAYMENT_GATEWAY_ERROR"]
Clearwater charges: 2
Final order status: paid
Verification: MATCH
```

## Result

The baseline-shaped gateway symptom remains, and the ledger still records two charges.
