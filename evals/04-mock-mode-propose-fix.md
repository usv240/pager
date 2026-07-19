# Eval 04 — Learner-facing mock recommendations

## Scenario

`MOCK_MODE=1` is enabled and the learner requests recommendations from `POST /api/agents/fixes`. The route is backed by `proposeFix`, then redacts internal metadata before returning the three authored options.

## Expected judgment

The response contains three hedge-free, comparably persuasive rationales. It exposes no `faultTag` or teaching content, and makes no network request.

## Fixed learner-facing output

```json
[
  {
    "id": "handle-confirmation-failure",
    "title": "Handle the gateway confirmation failure",
    "rationale": "Clearwater has already returned a successful charge, so a strict transition conflict should not turn that payment into a retryable checkout failure. Treat the completed order as confirmation, return the provider receipt, and remove the misleading 502 that sends customers back through checkout."
  },
  {
    "id": "send-clearwater-idempotency-key",
    "title": "Send an idempotency key to Clearwater",
    "rationale": "Give every payment attempt a stable identity derived from the order ID. Sending the same key for every submission of one checkout lets the payment boundary recognize repeat attempts as the same operation while preserving the existing order transition and error handling."
  },
  {
    "id": "claim-order-before-charging",
    "title": "Claim the order before charging",
    "rationale": "Establish ownership of the order before creating the external charge. Move the order into `charging`, let duplicate callers join the active checkout, and finalize `charging` to `paid` only after Clearwater succeeds so every caller receives one completed result backed by one charge."
  }
]
```

## Result

The recommendation cards give the learner equally confident arguments to inspect. Correctness metadata remains available only through the decision-gated reveal endpoint.
