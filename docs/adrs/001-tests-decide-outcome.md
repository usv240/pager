# ADR 001: Tests decide the outcome

## Decision
Pager uses each fixture's real Python or TypeScript test suite to decide whether an incident is resolved.

## Why
A fluent explanation is not proof. This keeps the learning loop honest: inspect, decide, execute, and learn from evidence.

## Tradeoff
Browser runners require more engineering than a mocked green check. They are worth it because Pager teaches verification, not prompt confidence.
