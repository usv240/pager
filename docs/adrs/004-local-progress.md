# ADR 004: Local progress for a no-account demo

## Decision
Current incident edits, decisions, and verification evidence are saved in browser storage.

## Why
A judge can return from the credential to the resolved workspace without rerunning the incident or creating an account.

## Tradeoff
Local browser data is not a signed or shared credential record. A production credential system would store signed evidence server-side.
