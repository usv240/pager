# Pager Product Plan

## Product position

Pager is not an incident-management platform and not a generic coding course. It is an execution-verified simulator for the moment a developer must decide whether to trust an AI repair during a production incident.

Real incident platforms such as Rootly and FireHydrant coordinate responders, automate runbooks, and preserve incident timelines. Hands-on platforms such as CodeCrafters, GitHub Skills, and Killercoda pair real work with automated feedback. Pager combines the parts learners cannot get from either category alone: realistic incident context, a plausible but fallible AI collaborator, a learner-owned decision, and an executable proof of the outcome.

## Current state

- **Strong:** complete TypeScript checkout and Python invoice-queue artifacts; browser runners; deterministic test authority; neutral AI-oversight decisions; incident framing; guided completion; credential flow; deployed production build.
- **Weak:** final browser smoke coverage and public demo materials remain release work; Java and C++ require isolated compiler sandboxes before they can be offered truthfully.
- **Do not expand yet:** Java, C++, accounts, leaderboards, dashboards, or a broad content catalog. The rules reward a coherent runnable product, not surface area.

## Judge-ready target

1. **Brief:** clearly state the service, impact, learner objective, and executable success condition.
2. **Investigate:** let the learner inspect the source and incident timeline without revealing the answer.
3. **Decide:** present AI recommendations neutrally; record an explicit Apply or Reject decision; reveal the teaching explanation only after that decision.
4. **Verify:** execute the real acceptance suite and show a legible pass/fail trace.
5. **Reflect:** explain the root cause, why the rejected proposal failed, and what execution proved.
6. **Prove:** mint a credential only after a passing run plus a recorded rejection of flawed AI advice.

## UX principles

- **Truthful:** never label an AI suggestion “verified” or “wrong” before the learner decides; no simulated pass state.
- **Progressive disclosure:** reveal the next needed detail, not the solution; show teaching feedback after the action.
- **One dominant action:** orient the learner around review, decision, verification, then credential.
- **High-stakes, calm:** incident-console visual language, clear hierarchy, no decorative gamification.
- **Accessible by default:** keyboard-operable controls, visible focus, semantic alerts/status, readable contrast, and mobile single-column flow.
- **Evidence first:** show exactly what the runner tested and why a pass or fail occurred.

## Ownership and order

| Priority | Work | Owner | Acceptance check |
| --- | --- | --- | --- |
| P0 | Neutral recommendation-review UX, decision trail, progress state, and accessible error/output surfaces | Ujwal | A learner cannot infer the correct answer from a card before acting; decisions are recorded in UI state. |
| P0 | Author three full candidate diffs, hidden fault tags, teaching feedback, stakeholder beats, and five eval transcripts | Subbu | Each wrong proposal is plausible, applies a real patch, and fails the acceptance test for its stated reason. |
| P0 | Wire authored agent/eval artifacts through both complete missions | Ujwal + Subbu | Reject wrong proposal, apply correct repair, real test passes, credential mints. |
| P1 | Add mission brief, root-cause debrief, and a guided first-run state | Ujwal | The default Python route has one obvious complete learning path and TypeScript remains equally playable. |
| P1 | Keep incident narrative and learning content manifest-owned | Ujwal + Subbu | Base stakeholder, telemetry, briefing, and debrief content live with each incident artifact, not UI components. |
| P2 | Record 3-minute demo and publish Devpost materials | Ujwal + Subbu | Shows the full loop, Codex/GPT-5.6 collaboration, repo, deployed URL, and `/feedback` session ID. |

## Subbu handoff — July 19, 2026

**Deliver by end of day:**

1. Add three authored AI-pair candidate diffs for `checkout-2pm`: one verified repair and two plausible but flawed repairs.
2. Keep each candidate's `faultTag` and teaching explanation hidden from the learner-facing recommendation; expose them only after the learner records a decision.
3. Add PM and Senior Engineer incident messages that create pressure and provide Socratic context without revealing the root cause.
4. Add five fixed eval cases in `evals/` proving that the flawed repairs fail the real acceptance behavior and the verified repair passes.
5. Push the content-only branch and share its commit SHA with Ujwal for integration and the end-to-end browser smoke test.

## Definition of done

The default Pager route opens the complete Python mission, with the complete TypeScript mission one click away. A judge can understand either goal in seconds, make a genuinely uncertain AI-oversight decision, inspect and modify real code, execute a real acceptance suite, receive a concise debrief, and reach a credential only through verified evidence.
