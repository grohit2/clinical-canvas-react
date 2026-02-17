# Tasks Learnings

- React Native/Hermes may not provide the PRNG path expected by `ulid` defaults. `src/domains/tasks/local-ledger/utils/ids.ts` now uses a monotonic ULID factory with explicit `crypto.getRandomValues` fallback (and final safe fallback) to avoid runtime `PRNG_DETECT` failures.
- Demo seeding must run through `applyOp` to preserve ledger invariants (ops, outbox, audit) and stay consistent with architecture.
- Dev seed logic should use an in-flight lock (not a permanent memoized result) so repeated calls re-check ledger state and remain idempotent.
- In mobile task bootstrap, invalidate task and actor-scoped ops queries after seed to refresh board/home/reminders/audit immediately.
- For parity UI diagnostics, direct `adb screencap` checks are faster than manual narration and catch real state mismatches (e.g., empty board vs seeded table) early.
