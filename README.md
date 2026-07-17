# Pager

**The gym for the one skill that now decides who gets hired: catching a confident AI that's wrong.**

You get *paged* into a live production incident inside a real codebase you've never seen — running in your browser, alert flashing red, an AI PM and senior engineer messaging you, a clock ticking. Beside you is an AI pair-programmer that proposes fixes — but some are subtly, confidently wrong (it patches the symptom, not the cause). You investigate, catch the bad fix, and ship the one that actually holds. When the real test suite passes and the alert clears, Pager mints an **execution-verified credential** — unfakeable proof you handled a real incident and caught an incorrect AI fix under pressure.

Built for **OpenAI Build Week** with **Codex + GPT-5.6**. Track: Education.

---

## Why

AI removed the bottom rung of the career ladder — entry-level tech hiring is down ~25% YoY, new-grad CS unemployment is 6–7%, and "entry-level" jobs demand years of experience nobody can get. Meanwhile the interview changed: Amazon and Stripe swapped LeetCode for real debugging and *"which AI-generated fix would you ship, and why?"* The skill being tested is now **judging AI, not writing code** — and there's nowhere to train it. Pager is that training ground.

## Status

🚧 Early build (OpenAI Build Week, Jul 2026). v1 = one mission: **"The 2 PM Incident"** — a checkout service double-charging customers under load.

## Getting started

```bash
npm install
npm run dev
```

Set `MOCK_MODE=1` to run the full experience offline with no API calls. To wire real models, add `OPENAI_API_KEY` to `.env.local`.

_(Setup expands as the build progresses.)_

## How we built it with Codex

See [`CODEX-LOG.md`](CODEX-LOG.md) for where Codex accelerated the work and the key decisions we made. Project context for the agent lives in [`AGENTS.md`](AGENTS.md).

## License

MIT — see [`LICENSE`](LICENSE).
