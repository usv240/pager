# Pager Demo Script (3 minutes)

## Setup

- Open the deployed Pager URL in an incognito window.
- Keep **The Invoice Queue Retry** selected first; it is the default easy Python incident.
- Keep **The 2 PM Incident** ready in the selector for the advanced TypeScript comparison.

## 0:00-0:25 - The problem

> "AI can write a fix quickly. The developer still owns the decision. Pager is where developers practice the judgment that comes after AI writes the code."

Point out the live incident alert, mission briefing, operational Signals, and the first-run guide. Explain that Pager is a simulator, not a generic coding challenge: every incident is designed around a believable but potentially unsafe repair.

## 0:25-1:20 - Python decision loop

1. Open `src/invoice_queue.py` and state the invariant: one pending item per invoice while preserving first-in order.
2. Read the incident chat: finance, on-call, PM, senior engineering, and AI Pair each add a different operational constraint.
3. Open **Repair options**. Review the side-by-side diff for a plausible wrong proposal and reject it.
4. Review **Guard duplicate pending work**, apply it, and run verification.
5. Show the evidence drawer: the Python `unittest` suite is the authority, not the AI suggestion.

## 1:20-2:20 - TypeScript production race

1. Switch to **The 2 PM Incident** from the TypeScript labs group.
2. Use Signals and the incident timeline to explain that two callers can reach the payment boundary for one pending order.
3. Review the code diffs. Reject a symptom-only or incomplete option, then apply **Claim the order before charging**.
4. Run verification and show the acceptance evidence: both callers complete with exactly one Clearwater charge.

## 2:20-3:00 - Why Pager is different

> "HackerRank assesses coding skills. Incident-management tools coordinate live responders. Coding agents generate and review code. Pager complements those tools by making verification discipline practiceable."

> "The learner must inspect real context, judge a plausible AI repair, and prove the outcome through execution. The credential appears only after a passing suite and a recorded rejection of flawed guidance."

Finish on the execution-verified credential, then return to the landing page to show the easy-to-advanced, Python and TypeScript practice path.
