# AI Pair Fault Model and Stakeholder Agents Specification

## 1. Purpose and scope

This document specifies Person B's Task 2/3 implementation for the `checkout-2pm` mission:

- `proposeFix(context)`: presents three authored fix candidates through the AI-pair persona.
- `stakeholderReply(role, context)`: produces phase-appropriate messages from Maya, the PM, and Jon, the senior engineer.
- `scripts/verify-candidates.ts`: proves the authored candidate outcomes by applying and executing every candidate against the real checkout service.

The implementation must preserve Pager's core trust boundary: code execution determines whether a fix works. A language model may change presentation in real mode, but it has no authority over candidate code, candidate selection, game state, or verification.

This specification does not authorize implementation yet.

## 2. Ground truth

The candidates target the committed service at:

`incidents/checkout-2pm/checkout-service/`

All three candidates replace this file:

`src/services/checkout-service.ts`

The baseline behavior is:

1. Read the order.
2. Require `pending_payment`.
3. Await `payments.charge(...)`.
4. Transition `pending_payment` to `paid`.
5. If that strict transition throws `InvalidOrderTransitionError`, log the gateway-blaming message and throw `PaymentGatewayError`.

The Clearwater adapter waits approximately 15 ms, always records and returns a successful charge, has no idempotency or deduplication behavior, and ignores extra object properties it does not read. The order domain already permits `pending_payment -> charging -> paid`.

These checked-in files are the source of truth when candidate patches are authored. Candidate patches must be regenerated or reviewed if the baseline target file changes.

## 3. Non-negotiable architecture

### 3.1 Authored candidate authority

The three fix candidates are fixed, pre-verified artifacts checked into:

`lib/agents/candidates/checkout-2pm.ts`

Each candidate includes the complete replacement content for its target file. The patch is executable source, not a diff, excerpt, instruction, or code fence.

At runtime, the language model must never:

- invent a candidate;
- modify candidate source;
- choose or rank candidates;
- omit or add candidates;
- change a candidate's `id`, `title`, `faultTag`, `targetFile`, or `patch`;
- decide whether a candidate passed;
- choose the stakeholder role or game phase.

The deterministic application layer always returns all three authored candidates in their checked-in order. It decides game phase from game state. Test execution decides correctness.

### 3.2 Presentation-only model role

In real mode, the language model may render the AI-pair voice around the authored candidates. Its output is limited to presentation text keyed by the exact authored candidate IDs. The implementation reattaches that text to the canonical checked-in artifacts; it never accepts code or metadata back from the model.

A valid AI-pair rendering response must:

- contain exactly the three expected IDs, once each;
- preserve their authored order;
- contain only display text for each ID;
- contain no source code, replacement patch, fault tag, correctness judgment, ranking, or recommendation to select one candidate.

Any invalid response is discarded in full and replaced with the authored content. Partial model output is never mixed into the candidate set.

Stakeholder rendering follows the same boundary. The deterministic layer selects one authored message intent by role and phase; the model may rephrase that intent without changing its meaning, disclosing the diagnosis, or recommending a candidate. Invalid output falls back to the exact authored message.

### 3.3 Mock mode

When `MOCK_MODE=1`:

- no model request is attempted;
- no API key is required;
- `proposeFix` returns the three authored candidates verbatim;
- `stakeholderReply` returns the exact authored message for the selected role and phase;
- the entire mission loop, candidate application, tests, and credential path remain usable offline.

Mock mode must not be implemented as a model failure path. It is a first-class deterministic runtime mode.

## 4. Required file layout

```text
lib/
  agents/
    SPEC.md
    index.ts
    propose-fix.ts
    stakeholder-reply.ts
    openai.ts
    types.ts
    candidates/
      checkout-2pm.ts
    personas/
      maya.ts
      jon.ts
    prompts/
      ai-pair.ts
      stakeholder.ts
scripts/
  verify-candidates.ts
```

Responsibilities:

| File | Responsibility |
| --- | --- |
| `lib/agents/index.ts` | Public exports only. |
| `lib/agents/propose-fix.ts` | Async candidate orchestration, mock/real branching, validation, and fallback. |
| `lib/agents/stakeholder-reply.ts` | Async deterministic role/phase selection, optional rendering, validation, and fallback. |
| `lib/agents/openai.ts` | Server-only plain-fetch Responses API client with timeout and normalized errors. |
| `lib/agents/types.ts` | Internal phase, authored-message, and presentation-only response shapes. |
| `lib/agents/candidates/checkout-2pm.ts` | The only canonical candidate metadata and complete patches. |
| `lib/agents/personas/maya.ts` | Maya's persona constraints and four authored mock messages. |
| `lib/agents/personas/jon.ts` | Jon's persona constraints and four authored mock messages. |
| `lib/agents/prompts/*.ts` | Lean presentation-only prompts. They contain no authority to write or evaluate code. |
| `scripts/verify-candidates.ts` | Isolated execution verifier for all authored candidates. |

No candidate source may be duplicated in prompts, persona files, route handlers, or UI components.

## 5. Public and internal contracts

### 5.1 Shared candidate contract

`FixCandidate` in `lib/types.ts` currently lacks `targetFile`. Implementation requires this pending one-line contract addition:

```ts
targetFile: string;
```

The resulting required candidate shape is:

```ts
type FixCandidate = {
  id: string;
  title: string;
  rationale: string;
  faultTag: FaultTag;
  targetFile: string;
  patch: string;
};
```

Candidate data must include `targetFile` from the first implementation commit, regardless of when the shared type addition is coordinated.
The shared `FaultTag` union remains unchanged; v1 simply has no `new-regression` candidate.

### 5.2 Async functions

Both public implementations are async:

```ts
proposeFix(context: FixContext): Promise<FixCandidate[]>
stakeholderReply(
  role: "pm" | "senior",
  context: StakeholderContext,
): Promise<StakeholderMessage>
```

The existing synchronous exports in `lib/index.ts` must be updated during implementation so callers await them. This spec does not change `generateIncident`, `runTests`, or `mintCredential`.

The AI pair is represented by `proposeFix`; `stakeholderReply` accepts only `pm` or `senior`. It must reject an unsupported role at the internal boundary rather than silently impersonating another persona.

### 5.3 Deterministic phase context

```ts
type AgentGamePhase =
  | "start"
  | "mid"
  | "after-wrong-fix"
  | "after-tests-fail";

type StakeholderContext = FixContext & {
  phase: AgentGamePhase;
  elapsedSeconds: number;
};
```

The game engine supplies `phase`. The model does not infer it. `StakeholderContext` and the narrowed PM/Senior role are internal types until the shared-contract coordination is complete. A deterministic adapter may derive the phase before calling the internal `stakeholderReply`, with these priorities:

1. A failed test run after applying an unverified candidate: `after-tests-fail`.
2. An unverified candidate has just been applied, before its result is shown: `after-wrong-fix`.
3. Investigation is underway and neither condition applies: `mid`.
4. Initial incident state: `start`.

The engine controls when a phase advances and prevents repeated unsolicited messages. The agent functions only produce content for a requested turn.

## 6. Authored candidates

### 6.1 Canonical ordering and identity

`checkout-2pm.ts` exports exactly these candidates in this order:

1. `handle-confirmation-failure`
2. `send-clearwater-idempotency-key`
3. `claim-order-before-charging`

All use:

```text
targetFile: src/services/checkout-service.ts
```

IDs are stable internal keys. UI copy uses titles, not IDs or fault tags. Fault tags are verification metadata and must not be shown to the player before mission completion.

Each `patch` is the complete modified content of `targetFile`, including all imports and the full class. It must compile as a full-file replacement. It must contain no comments or identifiers that describe a defect, concurrency hazard, lock, race, wrong fix, or intended lesson.

### 6.2 Candidate A: Handle the gateway confirmation failure

| Field | Required value |
| --- | --- |
| `id` | `handle-confirmation-failure` |
| `title` | `Handle the gateway confirmation failure` |
| `faultTag` | `symptom-not-cause` |
| `targetFile` | `src/services/checkout-service.ts` |

Patch behavior:

1. Preserve the baseline read-check-charge-transition ordering.
2. Preserve the successful Clearwater charge.
3. Catch the post-charge `InvalidOrderTransitionError`.
4. Read the completed order and return a successful `CheckoutResult` with the charge result instead of throwing `PaymentGatewayError`.
5. Do not alter the repository, gateway, domain transitions, or test files.

Expected two-request behavior: both calls fulfill, the final order is `paid`, and the Clearwater ledger contains two charges for the reference. The customer-facing 502 disappears, but the ledger invariant remains broken.

Authored rationale requirements:

- State confidently that a successful provider charge must not become a retryable checkout failure because local confirmation was already completed by another request.
- Emphasize restoring a successful customer response and preventing a misleading retry prompt.
- Do not hedge, disclose the fault tag, mention that two charges remain, or hint that this is a decoy.

Canonical mock rationale:

> Clearwater has already returned a successful charge, so a strict transition conflict should not turn that payment into a retryable checkout failure. Treat the completed order as confirmation, return the provider receipt, and remove the misleading 502 that sends customers back through checkout.

### 6.3 Candidate B: Send an idempotency key to Clearwater

| Field | Required value |
| --- | --- |
| `id` | `send-clearwater-idempotency-key` |
| `title` | `Send an idempotency key to Clearwater` |
| `faultTag` | `partial-fix` |
| `targetFile` | `src/services/checkout-service.ts` |

Patch behavior:

1. Preserve the baseline read-check-charge-transition ordering and error handling.
2. Construct a stable key derived only from the order ID, such as `checkout:${order.id}`.
3. Add that key as an extra property on the object passed to `payments.charge`.
4. Keep the gateway interface and Clearwater implementation byte-identical. Do not add idempotency handling, deduplication, a ledger lookup, or a new gateway method.
5. Use a TypeScript-valid object shape: create a local object containing all required charge fields plus the extra key, then pass that variable to `charge`. Clearwater reads only its known fields, so the extra property is ignored at runtime.

Expected two-request behavior: one call fulfills, one rejects with `PAYMENT_GATEWAY_ERROR`, the final order is `paid`, and the Clearwater ledger contains two charges. The proposed industry pattern has no effect because this invented adapter provides no idempotency contract or behavior.

Authored rationale requirements:

- Present a stable order-derived payment identity as the correct boundary for collapsing duplicate submissions.
- Emphasize that retries for one checkout should carry the same key.
- Do not hedge, mention Clearwater's lack of support, disclose the fault tag, or hint that the patch is ineffective.

Canonical mock rationale:

> Give every payment attempt a stable identity derived from the order ID. Sending the same key for every submission of one checkout lets the payment boundary recognize repeat attempts as the same operation while preserving the existing order transition and error handling.

### 6.4 Candidate C: Claim the order before charging

| Field | Required value |
| --- | --- |
| `id` | `claim-order-before-charging` |
| `title` | `Claim the order before charging` |
| `faultTag` | `verified` |
| `targetFile` | `src/services/checkout-service.ts` |

Patch behavior:

1. Keep an in-flight checkout promise keyed by order ID in the service instance.
2. If a request for that order is already in flight, return the same promise so the duplicate caller receives the completed successful result.
3. For the first caller, read and validate the order, then strictly transition `pending_payment` to `charging` before invoking Clearwater.
4. Charge exactly once.
5. Strictly transition `charging` to `paid` after the successful charge.
6. Return the paid order and charge result.
7. Remove the in-flight entry in `finally`, but only if it still refers to that operation.
8. Do not modify the gateway, repository, domain transition map, or tests.

The in-flight promise must be installed before yielding control so exactly two same-turn calls share it deterministically. The second caller must not receive an `OrderNotFoundError`, `CheckoutUnavailableError`, or transition error while the first caller is charging.

Expected two-request behavior: both calls fulfill with the completed checkout result, the final order is `paid`, and the Clearwater ledger contains exactly one charge.

Authored rationale requirements:

- Explain that the service must establish ownership before creating the irreversible external side effect.
- Explain that duplicate callers should join the active checkout and receive its result.
- Do not reference the verification tag or claim correctness because of hidden metadata; the rationale must stand on behavior.

Canonical mock rationale:

> Establish ownership of the order before creating the external charge. Move the order into `charging`, let duplicate callers join the active checkout, and finalize `charging` to `paid` only after Clearwater succeeds so every caller receives one completed result backed by one charge.

### 6.5 Persuasiveness parity

All three rationales use the same approximate length, specificity, and assertiveness. Presentation must not signal correctness through ordering, visual emphasis, qualifiers, warning language, confidence scores, fault tags, or extra detail. The two unverified candidates must sound at least as convincing as the verified candidate.

## 7. Candidate verification script

### 7.1 Purpose

`scripts/verify-candidates.ts` is the credibility gate for candidate artifacts. It proves by execution that each checked-in patch has the authored outcome. It is not a snapshot generator and must never rewrite candidates, the incident service, or expected results.

### 7.2 Isolation and execution procedure

For each candidate, the script must:

1. Resolve repository paths from the script location, not the current working directory.
2. Validate that exactly three unique expected candidate IDs exist and each target path is relative, remains inside the service root, and points to a real file.
3. Create a fresh directory under `os.tmpdir()`.
4. Copy `incidents/checkout-2pm/checkout-service/` into it, excluding `node_modules`, coverage output, build output, and transient test reports.
5. Replace only the candidate's `targetFile` with its complete `patch`.
6. Install from the checked-in lockfile using `npm ci`.
7. Run `npm test` with Vitest's machine-readable JSON reporter enabled.
8. Capture exit code, test-file results, individual test results, stdout, and stderr.
9. Compare the observed outcome to the candidate's `faultTag` and the stricter table below.
10. Remove the temporary directory in `finally`.

Commands must be spawned with argument arrays and `shell: false`. On Windows, use the platform-appropriate npm executable. A timeout must terminate a stalled child and mark verification failed. Output for each candidate must show its ID, expected outcome, observed failed files, test counts, and duration.

The verifier must not infer success from process exit code alone. It parses the reporter output and checks the exact failed-file set and test counts. It must normalize path separators before comparison.

### 7.3 Acceptance table

| Candidate | Fault tag | `npm test` exit | Concurrent calls | Charges for order | Final status | Failed test files | Ordinary tests |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| Handle the gateway confirmation failure | `symptom-not-cause` | Nonzero | 2 fulfilled | 2 | `paid` | Exactly `tests/concurrency.test.ts` | All green |
| Send an idempotency key to Clearwater | `partial-fix` | Nonzero | 1 fulfilled, 1 rejected with `PAYMENT_GATEWAY_ERROR` | 2 | `paid` | Exactly `tests/concurrency.test.ts` | All green |
| Claim the order before charging | `verified` | Zero | 2 fulfilled | 1 | `paid` | None | All green |

“Ordinary tests” means every test outside `tests/concurrency.test.ts`. The script records their discovered count rather than hard-coding a stale number, but requires at least one ordinary test and zero ordinary failures for every candidate.

The first two candidates are accepted only when the concurrency test fails for the expected ledger/result mismatch. A compilation failure, import error, timeout, install failure, malformed report, missing test, additional failed test, or different rejection type is a verification failure, not an acceptable failed suite.

The verified candidate is accepted only when every discovered test passes. Skipped, missing, or todo tests do not satisfy a required passing test.

### 7.4 Script exit behavior

The script continues through all three candidates to report every mismatch, then exits:

- `0` only if all three outcomes match the table;
- nonzero if artifact validation, setup, execution, parsing, cleanup accounting, or any expected outcome fails.

Checked-in CI must be able to run this script as a dedicated candidate-verification command. The normal game runtime never executes it.

## 8. Stakeholder agents

### 8.1 Shared behavior

Stakeholder messages are advisory narrative only. They cannot change the clock, alert, files, selected candidate, test result, or credential state. Each response must retain the requested role and selected phase.

Mock content contains four messages per persona, keyed by:

- `start`
- `mid`
- `after-wrong-fix`
- `after-tests-fail`

The key `after-wrong-fix` is internal orchestration terminology and must never appear in player-visible text or model prompts. The real-mode prompt describes only the observed game event.

### 8.2 Maya, PM

Persona guidelines:

- Maya is concise, operational, and respectful.
- She communicates customer or support impact, asks for an ETA, and tightens the requested update as elapsed time increases.
- She does not diagnose code, recommend a candidate, or use engineering terminology she would not need.
- Pressure escalates through specificity and shorter check-in windows, not hostility or panic.

Authored mock messages:

| Phase | Message |
| --- | --- |
| `start` | “Support has three customer reports and is holding replies. Give me an initial assessment and ETA within ten minutes.” |
| `mid` | “We need the next support update now. Is customer impact contained, and what is your current ETA to a verified checkout recovery?” |
| `after-wrong-fix` | “The customer-facing error changed, but finance still sees duplicate charge records. Does that change your ETA, and what are you verifying next?” |
| `after-tests-fail` | “Verification is still red, so I cannot call this contained. Tell me what the failed check disproved and give me the next ETA.” |

### 8.3 Jon, senior engineer

Persona guidelines:

- Jon is calm, terse, and Socratic.
- He asks one focused question at a time that directs attention to ordering, observed state, and irreversible side effects.
- He may quote facts already visible in logs or tests.
- He never names the race, critical section, lock, mutex, `charging` solution, correct candidate, or incorrect candidate.
- He never supplies replacement code or tells the player what to edit.

Authored mock messages:

| Phase | Message |
| --- | --- |
| `start` | “The log labels this a gateway failure. Which operation had already succeeded before that error was created?” |
| `mid` | “What does each request observe if two calls enter `processCheckout` before either charge promise resolves?” |
| `after-wrong-fix` | “The 502 is gone. What invariant does the ledger assertion enforce that response handling does not?” |
| `after-tests-fail` | “Compare the settled results with the ledger count. Which side effect occurs before the strict transition rejects the second caller?” |

Jon's questions may steer toward the interleaving, but neither authored nor model-rendered messages may use the forbidden diagnosis or tell the player how to guard it.

## 9. Real-mode Responses API

### 9.1 Client boundary

Real mode uses the OpenAI Responses API through plain `fetch`. It adds no npm dependency and does not use an SDK.

The client is server-only. `OPENAI_API_KEY` is read from `.env.local` through the server environment and is never exposed through a `NEXT_PUBLIC_` variable, sent to the browser, logged, or committed. `.env.local` remains ignored by Git.

Request configuration:

| Setting | Value |
| --- | --- |
| Endpoint | `POST https://api.openai.com/v1/responses` |
| Model | `gpt-5.6-terra` |
| Reasoning effort | `low` |
| Authentication | `Authorization: Bearer ${OPENAI_API_KEY}` |
| Content type | `application/json` |
| Tools | None |
| State | No persisted model conversation required |

Prompts must be lean. They contain only the persona constraints, the authored IDs or selected message intent, and the minimum incident context needed for phrasing. Candidate patch contents are never sent to the model because the model has no code-authoring role.

### 9.2 AI-pair prompt constraints

The AI-pair request supplies the three immutable IDs, titles, and authored rationales in canonical order. It asks for a concise first-person engineering presentation for each item and an exact ID-keyed response. It explicitly forbids:

- code or patch output;
- adding, removing, merging, ranking, or choosing candidates;
- mentioning fault tags, hidden tests, authored wrongness, or correctness;
- hedging language that weakens one candidate relative to another.

The response is accepted only after structural validation and safety checks. The returned `FixCandidate[]` always takes `id`, `title`, `faultTag`, `targetFile`, and `patch` from the authored module. Only `rationale` may use validated model phrasing.

### 9.3 Stakeholder prompt constraints

The stakeholder request supplies one persona, one phase's authored intent, elapsed time, and minimal visible facts. It asks for one short message. It forbids diagnosis, source edits, candidate selection, pass/fail decisions, and facts not present in context.

Jon's validator rejects forbidden direct-answer terms or imperative fix instructions. Maya's validator rejects code-specific prescriptions. Either case falls back to the exact authored phase message.

### 9.4 Graceful degradation

Every real-mode request uses a short `AbortController` timeout. The following all trigger the authored fallback without breaking the game:

- missing or blank API key;
- timeout or network failure;
- non-2xx response;
- rate limit, authentication, quota, or model-access error;
- malformed JSON or missing text;
- unexpected IDs, count, order, or fields;
- unsafe or out-of-persona content;
- any parsing or validation exception.

Fallback is local, immediate after the failure is known, and returns the same async contract. Logs may record a sanitized category such as `agent_render_fallback`; they must not include secrets, authorization headers, full provider responses, prompts containing user code, or stack traces in player-visible output.

The mission must remain playable when OpenAI is unreachable for the entire session.

## 10. Determinism and safety invariants

- Candidate artifacts are imported from one canonical module.
- Candidate order is fixed and never model-controlled.
- Full patches are applied only within the mission workspace or verification temp copy after path containment checks.
- Fault tags remain internal until the product intentionally reveals post-verification evidence.
- The LLM never sees or returns executable candidate source.
- `MOCK_MODE=1` performs zero network calls.
- Model failure cannot block candidate display or stakeholder messages.
- Stakeholder messages cannot mutate deterministic game state.
- Test execution, not model text, controls the alert and credential outcome.
- Candidate verification never mutates the committed incident service.

## 11. Tests required during implementation

Unit tests for `lib/agents` must cover:

1. Mock `proposeFix` returns exactly the three authored objects in canonical order.
2. Every candidate has the six required fields and a complete nonempty patch.
3. All candidate targets resolve to `src/services/checkout-service.ts` within the service root.
4. Mock mode makes no fetch call.
5. Real-mode presentation cannot alter immutable candidate fields.
6. Missing, malformed, reordered, partial, or extra model candidate output falls back to all authored candidates.
7. Each stakeholder role and phase returns its exact authored mock message in mock mode.
8. The phase is supplied or deterministically derived outside the model.
9. Provider errors and timeouts return authored content.
10. Jon's direct-answer or fix-prescribing response is rejected.
11. Maya's code-prescribing response is rejected.
12. Both public functions return promises.

The execution verifier separately proves the three patch outcomes against the real service. Unit tests may validate artifact shape but cannot replace execution verification.

## 12. Deliverable checklist

### Contracts and structure

- [ ] Add `targetFile: string` to `FixCandidate` in `lib/types.ts`.
- [ ] Make `proposeFix` and `stakeholderReply` async and update callers to await them.
- [ ] Create the required `lib/agents` file layout with server-only model access.
- [ ] Keep agent implementation behind the existing `/lib` model-facing boundary.

### Candidate artifacts

- [ ] Check in exactly three candidates in the specified order and with the specified IDs, titles, tags, and target file.
- [ ] Store a complete, executable full-file replacement in every `patch`.
- [ ] Keep the baseline read-check-charge-transition ordering in candidates A and B.
- [ ] Keep Clearwater and its gateway contract unchanged in candidate B.
- [ ] Make candidate C claim `pending_payment -> charging` before charging, complete `charging -> paid`, and share the completed result with a concurrent duplicate caller.
- [ ] Give every candidate a confident, similarly persuasive rationale with no correctness hints.
- [ ] Keep fault tags and verification metadata out of the player-facing candidate UI.

### Verification

- [ ] Implement `scripts/verify-candidates.ts` using temporary copies and full-file replacement.
- [ ] Run `npm test` for every candidate and parse machine-readable results.
- [ ] Require candidates A and B to fail only `tests/concurrency.test.ts` with their exact settled-result and two-charge signatures.
- [ ] Require candidate C to pass the entire suite with two fulfilled calls and one charge.
- [ ] Exit nonzero on every mismatch or infrastructure failure.
- [ ] Leave the committed checkout service unchanged after verification.

### Personas and runtime

- [ ] Check in four phase-keyed messages for Maya and four for Jon.
- [ ] Preserve Maya's escalating ETA pressure without hostility or technical diagnosis.
- [ ] Preserve Jon's Socratic guidance without naming the diagnosis, solution, or candidate correctness.
- [ ] Use plain `fetch`, `gpt-5.6-terra`, and low reasoning effort only in real mode.
- [ ] Read `OPENAI_API_KEY` server-side from `.env.local`; never commit or expose it.
- [ ] Validate all model presentation output before use.
- [ ] Fall back to authored content for every API, timeout, parsing, validation, or safety failure.
- [ ] Prove the complete mission loop works with `MOCK_MODE=1` and no network access.

### Final validation

- [ ] Run agent unit tests, typecheck, lint, and the production build.
- [ ] Run the candidate verification script successfully.
- [ ] Confirm no candidate code or selection is model-generated.
- [ ] Confirm test execution remains the only authority for mission success.
