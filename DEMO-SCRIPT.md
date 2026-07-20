# Pager Demo Script (3 minutes)

## Setup

- Open the deployed Pager URL in an incognito window.
- Keep the Python mission selected; it is the default route.
- Keep the TypeScript mission ready in the selector for the final comparison.

## 0:00–0:25 — The problem

"Pager is an execution-verified simulator for the decision developers face during a production incident: an AI pair offers a confident repair, but the engineer must decide whether it is safe to ship."

Point out the incident alert, operational signals, success condition, and guided workspace tour.

## 0:25–1:20 — Python decision loop

1. Open `src/invoice_queue.py` and state the invariant: one pending item per invoice while preserving first-in order.
2. Read the three neutral AI proposals. Reject the normalization and sorting proposals, then show the feedback that explains why they do not meet the invariant.
3. Apply **Guard duplicate pending work** and run verification.
4. Show the test drawer: the Python `unittest` suite is the authority, not the AI recommendation.

## 1:20–2:20 — TypeScript production race

1. Switch to **The 2 PM Incident**.
2. Use the explorer and incident timeline to explain that two callers reach the payment boundary before a strict state transition.
3. Reject the confirmation-handling and idempotency suggestions. Apply **Claim the order before charging**.
4. Run verification and show that both callers complete with exactly one Clearwater charge.

## 2:20–3:00 — Why Pager is trustworthy

"Pager does not pretend that model output is truth. Candidate repairs, incident content, and test suites are authored artifacts. The browser executes the real mission suite, feedback is decision-gated, and the credential unlocks only after proof."

Finish on the execution-verified credential and show the language selector.
