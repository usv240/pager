# TEAM.md — how Ujwal & Subbu build Pager together

Two people, ~3.5 days, one repo: https://github.com/usv240/pager

- **Ujwal = Person A — Platform & Experience** (the app, the engine, the deploy)
- **Subbu = Person B — Content & Agents** (the broken codebase, the fallible AI pair, the stakeholders)

The whole plan lives in `AGENTS.md` (Codex context), `Ladder-Master-Plan.md` (strategy/judging), and `Ladder-Build-Brief.md` (day-by-day). This doc is **who does what, and how our work merges without conflicts.**

---

## The rule that shapes everything

Build with **Codex + GPT-5.6** (Rules.md:349, 465, 471). We submit one **`/feedback` Codex Session ID** from the thread where the *majority of core functionality* was built (Rules.md:394) → that's **Ujwal's engine/core-loop thread.** Do the coding in Codex.

---

## The seam: how our code syncs seamlessly

**Golden rule: Ujwal and Subbu never edit the same file.** We split the repo into disjoint folders, and connect through a tiny shared contract created ONCE at the start.

### Directory ownership (no overlaps = no merge conflicts)

```
pager/
├── app/                     ← UJWAL  (Next.js routes/pages)
├── components/              ← UJWAL  (UI: editor, Slack panel, alert, clock, credential)
├── engine/                  ← UJWAL  (deterministic: clock, alert state, verification orchestration)
├── lib/
│   ├── types.ts             ← SHARED CONTRACT (created first — see below)
│   ├── index.ts             ← SHARED CONTRACT (MOCK_MODE switch: mock ↔ real)
│   ├── mocks/               ← UJWAL  (fake proposeFix/stakeholderReply/etc. to build UI against)
│   └── agents/              ← SUBBU  (real proposeFix/stakeholderReply/mintCredential)
├── incidents/
│   └── checkout-2pm/        ← SUBBU  (the generated broken codebase + planted bug + test suite)
├── evals/                   ← SUBBU  (fault-model tuning transcripts)
└── (config: package.json, tsconfig, tailwind — UJWAL sets up in Task 1)
```

### The shared contract (the ONLY files both import)

**Step 0, before either of us builds features:** Ujwal creates and pushes two small files to `main`:

- `lib/types.ts` — the shared data shapes: `Incident`, `FixCandidate` (with a `faultTag` field), `StakeholderMessage`, `TestResult`, `SessionLog`, `Credential`.
- `lib/index.ts` — exports the five functions, switching between `lib/mocks/*` and `lib/agents/*` based on `process.env.MOCK_MODE`.

Once these are on `main`, **Ujwal builds the UI against `lib/mocks`; Subbu builds `lib/agents` to the same signatures.** Neither waits on the other. When Subbu's real functions land, flipping `MOCK_MODE=0` swaps them in — no UI changes needed.

**The five contract functions** (signatures fixed on day 1; changing one = a 2-min Slack sync first):
- `generateIncident(): Incident` — loads the pre-generated codebase + tests + bug metadata.
- `proposeFix(context): FixCandidate[]` — the AI pair; 2–3 candidates, each tagged by fault model.
- `stakeholderReply(role, context): StakeholderMessage` — PM / Senior messages.
- `runTests(files): TestResult` — **deterministic, runs the real suite. Not an LLM.** (Ujwal owns this in `engine/`.)
- `mintCredential(sessionLog): Credential` — builds the shareable credential.

---

## Who does what (task by task)

### UJWAL (Person A) — order of work
1. **Task 1 — Scaffold + contract.** Next.js (App Router, TS strict, Tailwind). Create `lib/types.ts` + `lib/index.ts` + `lib/mocks/*`. Push to `main` immediately so Subbu can start.
2. **Task — War-room UI shell** (mocked): Monaco editor, Slack-style panel, red alert banner, clock, dashboard. Fully clickable on mocks.
3. **Task — Incident engine** (`engine/`): clock, alert state machine, the deterministic `runTests()` via WebContainers.
4. **Task — Verification loop + credential page**: tests pass → alert clears → `mintCredential` → shareable page.
5. **Task — Wire real agents** (flip `MOCK_MODE=0`), integrate Subbu's `lib/agents`.
6. **Task — Polish + deploy** to Vercel.

### SUBBU (Person B) — order of work
1. **Task — Generate the incident** (offline, `gpt-5.6-sol`): a ~2–5K-LOC checkout service (Node/TS) with a planted **race-condition double-charge** bug (symptom = payment-gateway error; cause = unguarded critical section) + a real test suite incl. a concurrency test. Commit to `incidents/checkout-2pm/`.
2. **Task — Fault model + AI pair** (`lib/agents/proposeFix`): generate 2–3 fixes, ≥1 authored-wrong (symptom-not-cause). Tag each with its fault type.
3. **Task — Stakeholder agents** (`lib/agents/stakeholderReply`): PM (pressure/ETA), Senior (Socratic, never the answer).
4. **Task — Eval transcripts** (`evals/`): ~5 fixed cases; tune so the bad fix is plausible — never obviously wrong, never actually right.
5. **Task — `mintCredential`** content + demo script + README/CODEX-LOG upkeep.

Both build against the same `lib/types.ts`, so integration (Ujwal's Task 5) is a flip of the flag, not a rewrite.

---

## Git workflow (do this every time)

1. **Clone once:** `git clone https://github.com/usv240/pager.git`
2. **Before each session:** `git pull --rebase origin main`
3. **Branch per task:** `git checkout -b ujwal/war-room` or `subbu/fault-model`
4. **Commit small, push, open PR, quick review, merge to `main`.**
5. **Keep `main` runnable** after every merge (`MOCK_MODE=1` must always work).
6. If you must touch a SHARED file (`lib/types.ts`, `lib/index.ts`, `package.json`), **ping the other person first** — these are the only real conflict risk.

---

## Codex + credits

- **Each requests their own $100 credits** (they don't pool across accounts).
- **Ujwal's engine/core-loop Codex thread = the submission `/feedback` Session ID.** Keep it focused.
- Mock-first everywhere; real API only in late tasks; `luna`/`terra` at runtime; `sol` offline once for codebase generation.
- After each task, add a `CODEX-LOG.md` entry: where Codex accelerated + the decisions we made.

## Sync checkpoints

- **End of Day 1:** Ujwal → UI shell playable on mocks; Subbu → codebase + bug + fault model drafted.
- **End of Day 2:** real bug + WebContainer execution + AI-pair fixes integrated. **Decide WebContainers vs. Monaco-fallback here.**
- **Day 4:** record demo (+ real CS-student tester if possible); README done.
- **Day 5 (Jul 21):** submit early PT — video, repo, `/feedback` ID, testing instructions. **Never 4:55.**

## Definition of done (v1)

One mission — "The 2 PM Incident" — end to end: paged → investigate → catch the AI's bad fix → ship the real fix → tests pass → alert clears → credential mints. Deployed, testable by judges with zero setup.
