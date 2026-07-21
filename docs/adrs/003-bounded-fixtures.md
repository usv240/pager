# ADR 003: Fixed incident fixtures, not arbitrary repositories

## Decision
Pager runs bounded, manifest-backed fixtures included in the product.

## Why
The demo needs safe, repeatable browser execution. This also lets every repair option and acceptance check be authored and reviewed.

## Tradeoff
Pager is not yet a runner for a user's own repository. That requires isolated server-side sandboxes, authentication, quotas, and audit logs.
