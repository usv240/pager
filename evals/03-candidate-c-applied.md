# Eval 03 — Candidate C applied

## Scenario

The learner applies **Claim the order before charging** to `src/services/checkout-service.ts` and runs the checkout suite.

## Expected judgment

The first request claims the checkout before calling Clearwater. A concurrent duplicate joins the completed result, so the full suite passes with one charge.

## Executable source of truth

`scripts/verify-candidates.ts`, candidate ID `claim-order-before-charging`.

## Actual verifier output — 2026-07-19

```text
=== claim-order-before-charging ===
Expected fault tag: verified
npm ci exit: 0 (5032 ms)
npm test exit: 0 (11532 ms)
Observed failed files: none
Ordinary tests: 17/17 passed
Total tests including verifier observation: 19
Settled outcomes: ["fulfilled","fulfilled"]
Clearwater charges: 1
Final order status: paid
Verification: MATCH
```

## Result

The verified candidate passes every test and preserves one charge for the order.
