# TEAM.md — how we build Pager together

Two people, ~3.5 days, one repo: https://github.com/usv240/pager

## The rule that shapes everything

Build with **Codex + GPT-5.6** (Rules.md:349, 465, 471). We submit one **`/feedback` Codex Session ID** from the thread where the *majority of core functionality* was built (Rules.md:394). Tech Implementation is scored on skillful Codex use. So: **do the coding in Codex.**

## Roles (own your lane; integrate at the interface)

### Person A — Platform & Experience (owns the app + the submission's core Codex thread)
- Next.js scaffold (App Router, TS strict, Tailwind).
- War-room UI: Monaco editor, Slack-style panel, red alert banner, clock, dashboard.
- WebContainer integration (run app + tests in-browser). Fallback: Monaco + test-runner server.
- Verification loop (real tests → alert clears) and credential mint page.
- Vercel deploy for judge testing.
- Builds against **mocked** `/lib` functions first (`MOCK_MODE=1`), zero API cost.

### Person B — Content & Agents (owns the intelligence)
- Pre-generate the broken **checkout** codebase + planted **race-condition double-charge** bug (offline `gpt-5.6-sol`).
- The AI-pair **fault model** (symptom-not-cause / passes-obvious-breaks-edge / introduces-new-hole).
- Agent prompts: PM (pressure), Senior (Socratic), AI Pair (confident, sometimes wrong).
- Fixed eval transcripts (~5) to tune the pair so it's plausible — never obviously wrong, never actually right.
- Real implementations of the `/lib` interfaces.
- Demo script + README + CODEX-LOG upkeep.

## The interface contract (why we never block each other)

Both sides code to these signatures in `/lib` (defined in AGENTS.md). A uses mocks; B ships the real ones. Swap is invisible.

- `generateIncident()` · `proposeFix(context)` · `stakeholderReply(role, context)` · `runTests(files)` (deterministic!) · `mintCredential(sessionLog)`

## Git workflow

1. Both clone: `git clone https://github.com/usv240/pager.git`
2. Work on short-lived branches: `git checkout -b a/ui-shell` or `b/agents`. Push, open a PR, quick review, merge to `main`.
3. **Pull `main` before starting each session** (`git pull --rebase origin main`).
4. File ownership avoids conflicts: A owns `/app`, `/components`; B owns `/lib` real impls, `/incidents` (generated codebase), `/evals`. Shared files (types, interfaces) — coordinate in chat before editing.
5. Keep `main` runnable after every merge.

## Codex + credits

- **Each person requests their own $100 credits** (don't pool across accounts).
- **Person A's core-loop thread = the submission `/feedback` Session ID.** Keep it focused on engine + verification + core loop.
- Person B's thread handles content/agents.
- Mock-first everywhere; real API only in dedicated late tasks; `luna`/`terra` at runtime, `sol` offline once for codebase generation.
- After each task, add a `CODEX-LOG.md` entry (accelerated where + decisions we made).

## Sync checkpoints (milestone gates)

- **End of Day 1:** mission playable on mocks (A) · codebase + bug + fault model drafted (B).
- **End of Day 2:** real bug + WebContainer execution + AI-pair fixes working. **Decide WebContainers vs. Monaco-fallback here.**
- **Day 4:** record demo (+ a real CS-student tester if possible); README done.
- **Day 5 (Jul 21):** submit early PT — video, repo, `/feedback` ID, testing instructions. **Never 4:55.**

## Definition of done (v1)

One mission — "The 2 PM Incident" — playable end to end: paged → investigate → catch the AI's bad fix → ship the real fix → tests pass → alert clears → credential mints. Deployed, testable by judges with zero setup.
