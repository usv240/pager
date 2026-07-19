# AI-pair fault-model evals

These fixed transcripts evaluate the authored `checkout-2pm` agent content. They are evidence artifacts, not model-generated grading prompts: the checkout candidate outcomes are determined by execution, and the voice checks are deterministic inspections of authored mock content.

| Case | Scope | Source of truth |
| --- | --- | --- |
| 01 | Candidate A applied | `scripts/verify-candidates.ts` |
| 02 | Candidate B applied | `scripts/verify-candidates.ts` |
| 03 | Candidate C applied | `scripts/verify-candidates.ts` |
| 04 | Learner-facing mock recommendations | `app/api/agents/fixes/route.ts` with `MOCK_MODE=1` |
| 05 | Jon phase messages | `lib/agents/personas/jon.ts` |

Cases 01–03 are rerun by `npm run verify:candidates`. The verifier makes a temporary copy of the checkout service for each full-file candidate patch, installs from the lockfile, runs the real Vitest suite, and rejects a mismatch from the acceptance table.
