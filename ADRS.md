# Architecture Decisions

This is a short record of the choices that make Pager trustworthy for a learner and easy to review for a judge.

## ADR 1: Tests decide the outcome

**Decision:** Pager uses the fixture's real Python or TypeScript test suite to decide whether an incident is resolved.

**Why:** A fluent explanation is not proof. This keeps the core learning loop honest: inspect, decide, execute, and learn from evidence.

**Tradeoff:** Browser runners are more work than a mocked green check. They are worth it because the product teaches verification, not prompt confidence.

## ADR 2: AI is a coach, not a grader

**Decision:** AI Pair presents authored repair candidates. The optional Coach gives short investigation support without selecting an option or exposing the answer.

**Why:** Learners need practice judging AI output. If AI grades itself, the main lesson disappears.

**Tradeoff:** Guided help is intentionally limited. This may feel less convenient, but it protects the learning goal.

## ADR 3: Fixed incident fixtures, not arbitrary repositories

**Decision:** Pager runs bounded, manifest-backed fixtures that are included in the product.

**Why:** The demo needs safe, repeatable browser execution. It also lets every repair option and acceptance check be authored and reviewed.

**Tradeoff:** Pager is not yet a runner for a user's own repository. That is future work requiring isolated server-side sandboxes, authentication, quotas, and audit logs.

## ADR 4: Local progress for a no-account demo

**Decision:** Current incident edits, decisions, and verification evidence are saved in browser storage.

**Why:** A judge can return from the credential to the resolved workspace without rerunning the incident or creating an account.

**Tradeoff:** Local browser data is not a signed or shared credential record. A production credential system would store signed evidence server-side.

## ADR 5: One workspace, progressive disclosure

**Decision:** Pager keeps the code in the center, incident context on the left, and conversation plus repair review on the right. Panels are resizable and guided practice explains them in sequence.

**Why:** This resembles the way engineers investigate a real incident while keeping the core path understandable for learners.

**Tradeoff:** The workspace has more information than a coding exercise. The guide, focus controls, and tabs reduce that cognitive load.
