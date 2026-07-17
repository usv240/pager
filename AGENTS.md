# AGENTS.md — Pager

> Standing context for Codex. Read this before every task. Prompts elsewhere stay lean and assume this file.

## What Pager is

Pager is the training ground for the one skill that now decides who gets hired in software: **catching a confident AI that is wrong.** The player is *paged* into a live production incident inside an unfamiliar codebase — the app is running, an alert is red, AI stakeholders are messaging in a Slack-style panel, a clock is ticking. Beside the player is an **AI pair-programmer that proposes fixes, some of them subtly and confidently wrong.** The player investigates, catches the bad fix, and ships the one that actually holds. When the real test suite passes and the alert clears, Pager mints an **execution-verified credential.**

**The hero mechanic is catching the AI's confident mistake.** Every design decision should sharpen that moment. Pager is NOT a generic "coding practice" site — it tests AI-oversight judgment, which no other product does.

## Why it exists (keep this in mind for copy/UX tone)

AI removed the bottom rung of the career ladder (entry-level tech hiring down ~25% YoY; new-grad CS unemployment 6–7%). Interviews shifted from LeetCode to real debugging and "which AI-generated fix would you ship, and why?" There is nowhere to train that skill. Pager is that gym. Tone: real, high-stakes, respectful of the user — like a good senior engineer, never gamified-cute.

## v1 scope (ONE mission, flawless — do not exceed)

**Mission: "The 2 PM Incident."**
- Target app: an e-commerce **checkout service** (Node/TypeScript), ~2–5K LOC, realistic structure, unfamiliar to the player.
- The bug: a **concurrency race condition that double-charges** customers under load. The *symptom* looks like a payment-gateway error (misdirection); the *root cause* is an unguarded critical section.
- Cast (all AI): **PM** (pressure/ETA), **Senior Eng** (Socratic nudges, never the answer), **AI Pair** (hero — proposes 2–3 fixes, ≥1 authored-wrong).
- Verification: the real test suite runs; the concurrency test must pass; the alert clears only on a genuine pass.
- Credential: a shareable page proving what happened, including "caught an incorrect AI fix," verified by execution.

**Out of scope for v1 (backlog — do not build):** multiple missions, user accounts, difficulty ladder, leaderboard, employer dashboard, non-JS languages.

## Architecture & principles

- **The engine is deterministic; the LLM is the actors + the content.** Alert state, clock, and pass/fail are code — so the demo is controllable and outcomes are honest. Never let an LLM decide whether the player "passed"; the test suite decides.
- **The AI pair's wrongness is *authored*, not accidental.** A controlled fault model (symptom-not-cause / passes-obvious-breaks-edge / introduces-new-hole), tuned on a fixed eval set, so fixes are plausible — never obviously wrong, never actually right.
- **Verification by execution, never by LLM grade** — this is the credibility core.
- **Mock-first, wire-late.** Build the whole loop against mocks behind a `MOCK_MODE` flag (zero API cost). Real model calls land in dedicated later tasks. Put all model-facing logic behind clean interfaces in `/lib`.

## Stack

- **Next.js** (App Router, TypeScript strict, Tailwind CSS).
- **@webcontainer/api** — run the target app + test suite live in-browser (zero setup for judges). *Fallback if it fights back:* Monaco editor + a lightweight server that runs the tests. Decide by end of Day 2.
- **Monaco editor** — the code surface.
- **OpenAI Responses API, GPT-5.6:** the broken codebase + planted bug are **pre-generated OFFLINE with `gpt-5.6-sol`** (not at runtime — cost). Runtime agents (PM/Senior/AI Pair) use `gpt-5.6-terra` or `luna`, `reasoning.effort` low/medium. Lean prompts.
- State: in-memory + `localStorage` session log. **No database in v1.**

## Model-facing interfaces (put behind /lib so mocks ↔ real swap cleanly)

- `generateIncident()` — returns the pre-generated codebase + test suite + bug metadata (offline artifact loaded at runtime, not a live call).
- `proposeFix(context)` — the AI pair; returns 2–3 candidate fixes tagged by the fault model.
- `stakeholderReply(role, context)` — PM / Senior messages.
- `runTests(files)` — executes the suite in the WebContainer; returns structured pass/fail. **Deterministic, not an LLM.**
- `mintCredential(sessionLog)` — builds the shareable credential content.

## Hackathon constraints (OpenAI Build Week — Rules.md)

- Must be built with **Codex + GPT-5.6**; capture the **`/feedback` Session ID** from the core-build thread.
- README must describe **how we collaborated with Codex** (keep `CODEX-LOG.md` per task: where Codex accelerated + decisions we made).
- Deliverable: <3-min public YouTube demo (audio covers Codex + GPT-5.6), public repo (or shared with testing@devpost.com + build-week-event@openai.com), deployed URL judges can use free without rebuilding.
- Track: **Education** (helping students get hired). Substantially different from Cadence (separate solo project) — different track, mechanism, audience.

## Working style

- One task at a time, each with clear success criteria. Keep the app runnable after every task.
- Let Codex run typecheck/lint/test/build and self-correct locally (free). Review every diff; keep changes scoped.
- Don't run the real API repeatedly in dev — use `MOCK_MODE=1` and a tiny fixed eval set (~5 transcripts) for the AI-pair fault model.
