# Pager

> **Practice the judgment that comes after AI writes the code.**

Pager is an execution-verified incident-response simulator for developers working alongside AI coding tools. It puts a learner inside a realistic production-style incident, provides plausible repair proposals, and requires the learner to inspect the code, reject unsafe changes, apply one repair, and prove the result by running the actual incident suite.

Pager does **not** grade a learner from an AI opinion. The browser sandbox runs the supplied tests against the learner's current code; that execution is the source of truth.

## Why Pager exists

AI makes it faster to produce a patch. It does not automatically make the patch safe. A repair can sound reasonable, remove an error message, or satisfy one visible symptom while still breaking the invariant that matters in production.

**Why now:** models just got good enough to produce confident, plausible, *wrong* patches at scale. That flips the scarce skill from writing code to verifying it — and there is no safe place to practice that verification judgment before it is learned from a bad 2 AM deploy. Pager is that place.

**Who it is for:** developers preparing for on-call and interviews today, and — next — engineering teams onboarding people to ship AI-written code responsibly, and instructors who need execution-graded practice instead of quiz answers.

Pager trains the missing loop:

1. Understand the incident and its operational constraint.
2. Trace the service and acceptance tests.
3. Judge authored repair proposals using their actual source diff.
4. Apply one repair and explicitly reject unsafe alternatives.
5. Run the real suite and use execution evidence to decide whether the incident is contained.

It complements AI coding assistants by teaching verification discipline in a realistic, interactive environment rather than asking learners to trust a generated answer.

## Where Pager fits (and what it is not)

Four adjacent categories touch this space. None occupy Pager's spot: an incident, a *fallible AI collaborator you must judge*, a learner-owned decision, and an executable proof — together.

| Category | Representative tools | What they do | The gap Pager fills |
| --- | --- | --- | --- |
| Incident simulation | Uptime Labs, game-day / fire-drill tooling | Drop engineers into a broken clone with real logs and terminals; human-facilitated | Enterprise, scheduled, facilitator-led, about response *coordination* — not judging an AI's proposed fix. Pager is self-serve, free, browser-only, and about the AI-repair decision. |
| Interactive coding practice | CodeCrafters, Killercoda, GitHub Skills | Build-from-scratch and DevOps labs in-browser with execution | No incident framing and no fallible AI collaborator to judge. They test whether you can build; Pager tests whether you can catch a wrong fix. |
| AI code-review tooling | Qodo, CodeRabbit, Greptile | Perform the review for you at PR time | They automate the reviewing; Pager trains the human to review — the skill that still matters when the tool is wrong. |
| Agent benchmarks | SWE-bench Verified | Measure whether an AI *can write* the patch | Pager measures whether a human *can tell when it cannot* — the inverse, and the currently ungraded half. |

**Positioning in one line:** *SWE-bench measures whether AI can write the fix. Pager measures whether you can catch it when it can't.*

This matters now because the industry has begun treating AI code review as a distinct discipline rather than a feature ([Qodo Academy](https://www.qodo.ai/academy/ai-code-review/), [Mend.io](https://www.mend.io/blog/ai-code-review-technologies-challenges-best-practices/)), and because studies show agent patches routinely pass a visible symptom while breaking a hidden invariant ([UTBoost](https://arxiv.org/pdf/2506.09289), [process-oriented error analysis of SWE agents](https://arxiv.org/pdf/2503.12374)) — the exact failure mode each Pager lab is built around. Teams that rehearse incidents resolve them measurably faster ([Uptime Labs](https://www.uptimelabs.io/learn/the-best-incident-response-training-providers)).

## How Codex and GPT-5.6 were used

Pager was built during OpenAI Build Week with **Codex** and **GPT-5.6**, and both are load-bearing — not decoration.

**GPT-5.6 authored the substance of every lab.**
- `gpt-5.6-sol` generated the incident specifications and the *broken target codebases* — each service, its planted invariant violation, and its acceptance suite. These are committed as fixed artifacts loaded at runtime, so grading stays deterministic instead of depending on a live model call.
- `gpt-5.6-terra` (low reasoning effort) is the runtime model behind `proposeFix` and `stakeholderReply` — it renders the fallible AI repair proposals and the stakeholder pressure a learner reasons against. `MOCK_MODE=1` falls back to the committed safe artifacts so the product runs with no key.

**Codex accelerated the platform around that substance** — the manifest and runner architecture, the Pyodide and WebContainer execution boundaries, candidate verification scripts, the workspace UX, deterministic verification, browser tests, and documentation.

**The humans owned the judgment calls.** Ujwal and Subbu decided that Pager must be an education product, that repair options must be authored and neutral *before* a learner decides, that execution — never a model — remains the grading authority, and that unsupported compiler languages must not be marketed as available.

- The detailed task-by-task build record, decisions, and core-build `/feedback` Session ID (`019f72a4-8de8-7a90-8082-5f6c1a99edd5`) are in [`CODEX-LOG.md`](CODEX-LOG.md).
- The judge walkthrough is in the **Judge quick start** section below.
- Submission requirements are tracked against the [OpenAI Build Week official rules](https://openai.devpost.com/rules).

## Judge quick start

**Live demo:** [pager-flax-psi.vercel.app](https://pager-flax-psi.vercel.app)

No account, installation, API key, or payment is required to evaluate the core product.

1. Select **Start incident** and open **The Invoice Queue Retry**.
2. Read **Brief** and **Signals**, then inspect the source and test file from **Files**.
3. In **Incident Intelligence**, review each repair diff. Reject the unsafe options and apply **Guard duplicate pending work**.
4. Run **Verification**. The in-browser Python unittest suite must pass before the credential becomes available.
5. Switch to **The 2 PM Incident** to inspect the TypeScript/WebContainer concurrency scenario.

The optional Live Coach needs `OPENAI_API_KEY`; all repair-review and verification flows remain fully runnable without it.

## What is shipped

### Five execution-verified incident labs

| Incident | Language | Difficulty | Failure mode | Browser runner |
| --- | --- | --- | --- | --- |
| The Invoice Queue Retry | Python | Easy | Repeated retries enqueue duplicate invoice work. | Pyodide + `unittest` |
| The Inventory Reservation Retry | Python | Medium | Retry handling duplicates a reservation while other orders must remain intact. | Pyodide + `unittest` |
| The Settlement Replay Claim | Python | Advanced | A replay needs a durable claim before an external settlement side effect. | Pyodide + `unittest` |
| The Webhook Replay | TypeScript | Medium | A replayed webhook can trigger the same work twice. | WebContainer + project tests |
| The 2 PM Incident | TypeScript | Advanced | Concurrent checkout callers can create more than one external charge. | WebContainer + project tests |

Each lab has its own manifest, service fixture, test suite, alert, operational telemetry, stakeholder conversation, repair candidates, and acceptance criteria. Python and TypeScript/JavaScript labs are intentionally separated by the language filter and the incident selector.

### Production-style investigation workspace

- **Mission Control**: the left rail has four focused tabs:
  - **Brief** explains the incident, operational impact, success condition, and recommended investigation sequence.
  - **Signals** presents service health and a time-ordered operational timeline.
  - **Files** exposes the incident's complete fixture tree and opens source or tests in the editor.
  - **Evidence** summarizes the latest execution result, including per-test failure details.
- **Code editor**: Monaco renders the actual incident files. Learners can make code changes directly; edits are local to the selected incident draft.
- **Incident Intelligence**: the right rail separates stakeholder context from repair review:
  - **Incident chat** contains incident-specific messages from product, engineering, SRE, support, finance, and the AI Pair where relevant.
  - **Repair options** are authored candidate patches with an actual before/after code comparison before a learner makes a decision.
- **Verification drawer**: a resizable bottom panel runs the incident's real acceptance suite and shows a structured pass/fail record with useful assertion evidence.
- **Live Coach**: an optional AI investigation assistant is available as a panel rather than occupying the workspace permanently.

### Workspace ergonomics

- Resizable left rail, right rail, and verification drawer, with keyboard-accessible separators.
- **Focus code** temporarily hides both context rails so learners can work in the editor without losing their investigation state; one control restores the full workspace.
- The default Brief exposes the objective and success condition first, while the detailed investigation checklist and starter files are disclosed on demand.
- Minimize and maximize controls for Incident Intelligence; a visible control restores it after minimization.
- Light and dark themes with a restrained console-style visual system, high contrast, clear hierarchy, and minimal decorative effects.
- A nine-step guided practice tour highlights the actual controls in order: map, brief, signals, files, editor, chat, repair options, verification, and evidence.
- The tour can be skipped, closed with Escape, or restarted from **Guided practice**. Dismissal is remembered locally so it does not interrupt every reload.
- Tooltips and information controls explain why panels and actions exist without making the primary screen noisy.
- Mobile and narrow layouts prioritize the central task and allow rails to be resized or minimized instead of forcing all information into one fixed view.

## The learning loop

Pager deliberately makes the repair decision more demanding than clicking through suggestions.

1. Open the **Brief** and **Signals** to learn what must remain true.
2. Read the **Incident chat** for the pressure, business impact, and engineering constraint.
3. Inspect source and tests from **Files** or the editor's file picker.
4. Select **Review option** to see a side-by-side diff between current code and an authored proposal.
5. Decide whether to apply or reject the proposal. Feedback and the candidate's fault explanation are revealed only after that decision.
6. Only one repair can be active at a time. Applying another option requires resolving the current decision instead of stacking patches until tests happen to pass.
7. Run verification against the current in-memory code.
8. To mint a credential, the learner must review every repair option, reject the unsafe alternatives, apply the safe repair, and pass the actual suite.

This protects the core learning goal: a passing outcome must be backed by a defensible decision trail, not random patch accumulation.

## AI Pair, repair options, and Coach

These are intentionally different tools.

| Surface | What it is | What it can do | What it cannot do |
| --- | --- | --- | --- |
| **Incident chat** | Authored stakeholder context for the selected incident. | Explains impact, constraints, timeline, and questions the code must answer. | Change code or grade the learner. |
| **Repair options** | Authored, deterministic candidate diffs. | Lets learners inspect, apply, or reject a concrete patch. | Change based on a model's opinion at runtime. |
| **AI Pair** | The contextual teammate voice in incident chat. | Provides investigation-oriented context. | Decide the correct repair for the learner. |
| **Live Coach** | Optional server-side AI assistance. | Helps the learner choose an artifact to inspect, restate an invariant, or understand test evidence. | Name/rank a repair, supply a patch, identify a line-by-line solution, or grade the decision. |
| **Verification** | Browser execution runner. | Runs tests and reports pass/fail evidence. | Depend on the AI system for its result. |

### Coach context and guardrails

When enabled, the Coach receives context for the **currently selected incident only**:

- incident title, alert, severity, affected service, objective, and success criterion;
- operational services and timeline events;
- incident chat messages;
- a safe file map and the currently open source file;
- the latest test summary and per-test results.

Repair-option metadata, hidden fault tags, and teaching feedback are excluded from Coach context. The server prompt directs the Coach to answer in a short **Observation / Question / Next step** format and to redirect direct-answer requests toward investigation. The response filter rejects code blocks, direct option recommendations, and answer-leaking phrases before returning a response.

The Coach is optional support only. It never controls the repair review state, test runner, credential, or score.

## Architecture

```text
                        +-------------------------------+
                        |          Next.js UI            |
                        | landing + workspace + guide    |
                        +---------------+---------------+
                                        |
     +----------------------------------+----------------------------------+
     |                                  |                                  |
     v                                  v                                  v
+------------+                 +------------------+              +------------------+
| Manifest / |                 | Browser runners  |              | Server AI routes |
| fixture     |                 |                  |              |                  |
| loader      |                 | Python: Pyodide  |              | Coach only       |
|             |                 | TS/JS:           |              | optional OpenAI  |
| JSON source |                 | WebContainer     |              | Responses API    |
+-----+------+                 +--------+---------+              +--------+---------+
      |                                 |                                 |
      v                                 v                                 v
Incident metadata,                Actual test output,             Bounded guidance;
file tree, chat,                  structured test results,        never grading or
telemetry, repair                 credential eligibility           runner authority
candidates
```

### Application structure

```text
app/
  page.tsx                       Landing page
  credential/                    Execution-verified completion view
  api/incidents/                 Manifest-backed incident catalog
  api/incident/                  Selected incident payload
  api/agents/                    Coach, stakeholder, repair review APIs
components/
  pager-landing.tsx              Product positioning and lab catalog
  incident-workbench.tsx         Workspace state and decision loop
  workspace-guide.tsx            Highlighted onboarding flow
  code-editor.tsx                Monaco integration
engine/
  incident-manifest.ts           Manifest parsing and validation
  incident-loader.ts             Fixture loading and file allow-listing
  runners/                       WebContainer and Pyodide execution adapters
incidents/
  <incident-id>/manifest.json    Incident source of truth
  <incident-id>/service/         Runnable fixture source and tests
lib/
  agents/                        Server-only OpenAI adapter and Coach guardrails
  credentials.ts                 Credential data and eligibility helpers
scripts/                         Candidate and progression verification scripts
tests/agents.test.ts             API/guardrail/unit test coverage
```

### Manifest-driven content model

Every lab is defined by `incidents/<incident-id>/manifest.json`. The manifest validates and supplies:

- identity, title, language, difficulty, availability, severity, and service;
- alert text, incident briefing, verification objective, and success criterion;
- operational telemetry and incident-specific stakeholder messages;
- source directory, initial file, runner kind, install command, and test command.

The server-side loader recursively gathers only approved source extensions from the fixture directory and ignores build output and dependency directories. The browser receives the bounded fixture rather than unrestricted repository access.

### Real browser execution

Pager does not simulate a green check with a hardcoded response.

- **TypeScript / JavaScript** labs boot an isolated [WebContainer](https://webcontainers.io/) session in the browser, mount fixture files, install fixture dependencies on first run, write only changed files on later runs, and execute the authored test command.
- **Python** labs load Pyodide in the browser, write the fixture files into its virtual filesystem, invalidate import caches, clear previous incident modules, and run `unittest` discovery. Clearing cached service/test modules prevents stale state from causing a later verification run to use old code.
- Runner output is parsed into a shared structured result: overall status, a human-readable summary, individual tests, and assertion details where available.
- The workspace keeps the latest file state synchronously before dispatching a run so the first verification click uses the code the learner sees.

WebContainers require cross-origin isolation. `next.config.ts` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for the application.

## State, drafts, and reset behavior

Pager is deliberately session-oriented and has no account requirement.

- Code drafts and the active file are saved in browser `localStorage` per incident under a versioned Pager key.
- Rail sizes, panel visibility, and theme preferences are preserved locally.
- **Restore code** returns only the source files to the incident baseline while preserving decision evidence.
- **Reset incident** restores the baseline files and clears repair decisions, execution results, credential state, and Coach conversation for that incident.
- Guided-practice dismissal is stored locally; users can relaunch the guide whenever they want.

No fixture code, learner draft, or test result is written to a shared production database by the current application.

## Supported and planned languages

| Status | Languages | Reason |
| --- | --- | --- |
| Supported now | Python, TypeScript / JavaScript | Each has an isolated in-browser runner and real authored acceptance suites. |
| Planned | Java, C++, additional languages | Pager will add them only after providing verified isolated runtimes, fixtures, and test behavior. |

Pager intentionally does not claim Java or C++ support yet. A language selector without a trusted runner would be a fake capability.

## Run locally

### Prerequisites

- Node.js 20 or newer
- npm
- A modern Chromium-based browser is recommended for WebContainers

### Install and start

```bash
cd pager
npm install
npm run dev
```

Open `http://localhost:3000`.

To choose another port:

```bash
npm run dev -- -p 3011
```

If the port is already occupied, either open the existing local server or use a different port. On Windows, you can find the owner with:

```powershell
Get-NetTCPConnection -LocalPort 3010 | Select-Object OwningProcess
Get-Process -Id <PID>
```

### Optional Live Coach configuration

Create `pager/.env.local` locally. Never commit this file.

```dotenv
OPENAI_API_KEY=your_key_here
MOCK_MODE=0
# Optional; defaults to 4000 milliseconds
PAGER_AGENT_TIMEOUT_MS=4000
```

With no API key, or with `MOCK_MODE=1`, the product remains fully usable: repair review and verification are deterministic. The optional Coach displays safe unavailable guidance instead of pretending to have live AI support.

When Live Coach is enabled, questions plus the selected incident's bounded investigation context are sent to the configured OpenAI API. Do not paste credentials, private customer data, or real production secrets into Coach prompts.

## Validate the project

Run these commands before a handoff or deployment:

```bash
npm run typecheck
npm run lint
npm run test:agents
npm run test:e2e
npm run verify:candidates
npm run verify:python-candidates
npm run verify:python-progression
npm run verify:expanded-candidates
npx playwright install chromium # first time only
npm run test:e2e
npm run build
```

What each check covers:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Strict TypeScript validation. |
| `npm run lint` | Next.js/ESLint quality checks. |
| `npm run test:agents` | Coach API validation, safety behavior, and repair-review related tests. |
| `npm run test:e2e` | Playwright Chromium coverage of the critical learner loop: choose a lab, inspect repair diffs, reject unsafe repairs, apply the safe repair, execute, and mint a credential. The first run needs the Playwright Chromium browser installed. |
| `npm run verify:candidates` | Verifies TypeScript candidate fixtures against expected outcomes. |
| `npm run verify:python-candidates` | Verifies Python candidate fixtures. |
| `npm run verify:python-progression` | Verifies easy, medium, and advanced Python candidate progression. |
| `npm run verify:expanded-candidates` | Checks the expanded candidate catalog. |
| `npm run build` | Creates a production Next.js build and validates routes. |

### Manual end-to-end QA

For each lab:

1. Select the lab from the incident picker and confirm the title, difficulty, language, alert, chat, and file tree change.
2. Start guided practice once; confirm each highlighted control is reachable, then skip and reload to confirm the tour stays dismissed.
3. Open a source file and its corresponding test file.
4. Review all three repair options. Reject unsafe options and apply the safe one.
5. Run verification; inspect both the bottom results and left-rail Evidence view.
6. Edit code, run verification again, and confirm the runner uses the new content.
7. Use **Restore code** and **Reset incident** to confirm their different scopes.
8. Minimize and reopen Incident Intelligence; resize both rails and the verification drawer.
9. Toggle light/dark mode and confirm controls remain legible.
10. Open Coach, ask for an investigation step, and confirm it guides without supplying the repair.

## Deploy to Vercel

1. Import the `pager` repository/project in Vercel.
2. Use the default Next.js build settings (`npm run build`).
3. Add `OPENAI_API_KEY` only if deploying Live Coach. Set `MOCK_MODE=0` to enable it.
4. Keep `.env.local` out of Git; use Vercel environment variables for production.
5. Confirm the deployment serves the cross-origin-isolation headers required by WebContainers.
6. Run the manual end-to-end checklist in the deployed browser, especially both runner types.

A production deployment does not connect to an actual company incident system. Pager's "production" language and telemetry are realistic simulation artifacts for training.

## Security and privacy boundaries

- No API key is shipped to the browser. OpenAI calls use the server-only adapter in `lib/agents/`.
- Live Coach accepts same-origin browser requests only when an `Origin` header is supplied, validates and bounds the request body, applies a configurable timeout, and uses an in-memory request limit of 12 requests per 10 minutes per client identifier.
- Repair evaluation and credentials are deterministic; an LLM cannot mark an unsafe repair correct.
- Browser runners execute only the selected fixture in their own runtime. They are not a replacement for server-side sandboxing of untrusted arbitrary repositories.
- Current persistence is local browser state, not authenticated multi-user storage.
- The in-memory Coach rate limit is suitable for the hackathon prototype; a multi-instance deployment should move rate limiting to a shared store and add authentication, audit logging, and abuse monitoring.
- Run `npm audit --omit=dev` in CI and review its output before releases. Dependency scanning reduces risk; it does not replace patch management and security review.

## Add a new incident

Use the existing labs as a template. A new incident should include:

1. `incidents/<id>/manifest.json` with validated metadata, chat, telemetry, and execution configuration.
2. A complete runnable fixture under `incidents/<id>/service/`, including source and acceptance tests.
3. Three or more authored repair candidates: plausible unsafe alternatives and one safe repair.
4. Candidate verification coverage that proves the expected pass/fail behavior.
5. Distinct stakeholder messages and operational signals that match the incident's actual invariant.
6. A difficulty label that reflects the required reasoning, not merely the number of files.
7. Updates to the catalog and progression scripts as needed.

Do not add a language tab until its fixture can run in an isolated, browser-compatible runner and its validation command is reliable.

## Demo and hackathon materials

- [`DEVPOST-HANDOFF.md`](DEVPOST-HANDOFF.md): submission and handoff material.
- [`USER-TEST-PROTOCOL.md`](USER-TEST-PROTOCOL.md): a short, ethical script for collecting real first-time learner feedback.
- The recording script is intentionally local-only; the public demo video is the judge-facing walkthrough.
- [`PRODUCT-PLAN.md`](PRODUCT-PLAN.md): product scope and planned direction.
- [`TEAM.md`](TEAM.md): team context.
- [`CODEX-LOG.md`](CODEX-LOG.md): AI-assisted development log.

## Future work and scaling roadmap

Pager is intentionally focused on a credible core learning loop. These are planned capabilities, not claims that they already exist.

### Content and learning scale

- Add incident packs across authentication, data migrations, queues, caching, observability, and distributed systems while retaining a real acceptance suite for every pack.
- Build an instructor content pipeline for manifests, fixture repos, candidate patches, evaluation cases, and rubric review.
- Add learner profiles, private cohorts, classroom assignments, progress history, and durable credential records.
- Introduce adaptive sequencing based on verified mistakes and evidence-reading patterns, never on an LLM deciding competence.

### Platform scale

- Move local drafts, Coach conversations, rate limits, and credential records to authenticated, multi-tenant storage with row-level access controls.
- Replace in-memory Coach throttling with a shared rate-limit store and edge/WAF controls; add audit logs, abuse monitoring, and budget controls per learner or organization.
- Keep client-safe runners for known fixtures, while moving future arbitrary or heavier language execution to ephemeral server-side sandboxes with strict CPU, memory, time, network, and filesystem isolation.
- Add a job queue and runner pool for concurrent classrooms; store execution artifacts separately from product data and retain them under explicit privacy controls.
- Add metrics for runner availability, test latency, Coach refusal/error rates, learning completion, and accessibility regressions.

### Quality and security roadmap

- Maintain Playwright coverage for the critical learner loop and expand it to all five labs, reset/retry behavior, resizing, narrow screens, light/dark themes, and Coach failure states.
- Add automated accessibility checks, cross-browser validation, dependency scanning, signed release artifacts, and deployment health checks.
- Add organization SSO, privacy controls, consented telemetry, data-retention policies, and a security review before handling any real customer or repository data.
- Add Java, C++, and other languages only after each has a verified isolated runner, deterministic fixture suite, and repeatable local/CI validation.

## License

See [`LICENSE`](LICENSE).
