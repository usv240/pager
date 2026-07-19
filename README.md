# Pager

**Pager trains the judgment to catch a confident AI that is wrong.**

Players are paged into a production incident in an unfamiliar codebase. They inspect the repository, weigh AI-proposed repairs, reject symptom-only advice, and run the incident's actual test suite. Pager mints a credential only after execution verifies the repair and the session records that the player rejected incorrect AI advice.

Built for **OpenAI Build Week** with **Codex + GPT-5.6**. Track: **Education**.

## What the learner experiences

- A full-width, IDE-style incident workspace: mission context and file explorer on the left, Monaco editor in the center, and incident intelligence on the right.
- A persistent Pager command bar and active incident alert, so the operational context remains visible while investigating.
- A first-run, four-step workspace guide with Back, Next, Escape, and Skip controls. **Guide** in the command bar reopens it at any time.
- Authored stakeholder context and AI repair proposals. Learners must make a decision before Pager exposes the teaching feedback.
- An optional **Live AI Pair** question box. When configured, it gives constrained, Socratic investigation help without revealing the winning proposal or supplying a paste-ready patch.
- Light and dark themes, plus an execution-verified credential after a correct repair and sound AI oversight judgment.

## The v1 mission

**The 2 PM Incident** is a 2,519-line TypeScript checkout service with a planted race condition. Two concurrent checkout calls can both charge the same order; the losing request misleadingly looks like a payment-gateway failure. The mission's acceptance test distinguishes a symptom-only fix from a repair that actually guarantees one charge.

Pager also includes an **experimental Python/Pyodide runner** and a small Python incident to prove the language-runner architecture. The TypeScript mission is the fully authored v1 learning experience.

## Run locally

Requirements: Node.js 20 or newer and an internet connection for first-run WebContainer/Pyodide downloads.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Choose a mission from the selector:

- **The 2 PM Incident** - TypeScript executed in WebContainer.
- **The Invoice Queue Retry** - experimental Python executed in Pyodide.

### Enable Live AI Pair locally (optional)

Pager runs the deterministic mission without an API key. To enable learner questions to the Live AI Pair, create a local-only `pager/.env.local` file:

```env
OPENAI_API_KEY=your_key_here
MOCK_MODE=0
```

Restart the development server after changing environment variables. `.env.local` is intentionally local and must never be committed. In Vercel, set the same variables in the project environment settings.

### TypeScript demo path

1. Open **The 2 PM Incident**.
2. Reject either incorrect AI recommendation.
3. Apply **Share in-flight checkout work**.
4. Run the verification suite.
5. On a genuine test pass, Pager opens the execution-verified credential screen.

The test suite, not an LLM, decides whether the alert clears or a credential mints.

### Validate the app

```bash
npm run typecheck
npm run lint
npm run build
```

## Architecture

- `incidents/<id>/manifest.json` defines a mission's language, runner, timing, source root, and test command.
- `engine/runners/` selects an execution runtime. Only verified runners are enabled for learners.
- `webcontainer-node` runs the TypeScript mission's real `npm test` suite in the browser.
- `pyodide` runs standard-library Python `unittest` fixtures in the browser; it remains experimental pending final browser smoke testing.
- `lib/mocks/` supplies the current authored TypeScript stakeholder and AI-pair content. Live model agents stay behind the same interface and will not change deterministic verification.
- `app/api/agents/ask/` is the server-only optional Live AI Pair endpoint. It requires `OPENAI_API_KEY`, preserves the no-answer-reveal boundary, and never determines mission completion.

Java and C++ are intentionally not presented as supported. They require isolated compiler sandboxes before Pager can honestly execute their missions.

## Deploy

Pager is a standard Next.js App Router application and deploys to Vercel. The included cross-origin isolation headers are required for WebContainer execution. Deploy the `main` branch only after the browser verification flow has been smoke-tested.

## How we built with Codex

[`CODEX-LOG.md`](CODEX-LOG.md) records where Codex accelerated the work, the decisions the team made, and how GPT-5.6 was used. The task context and constraints live in [`AGENTS.md`](AGENTS.md).

## License

MIT - see [`LICENSE`](LICENSE).
