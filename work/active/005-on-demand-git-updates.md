---
id: 005
title: Make Git update checks targeted and on demand
status: active
priority: normal
type: feature
areas:
  - rust
  - frontend
  - platform
created: 2026-07-24
completed:
---

# Goal

Harden the Git-for-Windows update prototype so it is targeted, transparent, and does not add an implicit network operation to every app launch.

# User outcome

A user can deliberately check whether Git needs an update and start it with clear progress and failure states, without slowing normal startup.

# Context

Task 002 added a working prototype based on `winget upgrade`. The current check runs after startup and lists every upgradable package before searching for `Git.Git`.

# Scope

- Trigger update checks from Settings or another explicit action instead of every launch.
- Query only `Git.Git` where `winget` supports it.
- Distinguish unavailable checker, no update, update available, and failed check.
- Add timeout/cancellation appropriate for a network-dependent command.
- Cache successful results briefly.
- Prevent duplicate update launches.
- Test output/state mapping without contacting package sources or launching an updater.

# Out of scope

- Updating Git automatically.
- Updating packages other than Git.
- Building a general application updater.
- Installing Git when it is missing; see task 004.

# Acceptance criteria

- [ ] Startup does not automatically run a network-dependent package query.
- [ ] Update discovery targets Git instead of listing every package.
- [ ] The UI distinguishes checking, unavailable, up-to-date, update available, and failed states.
- [ ] Update launch remains explicit and duplicate launches are prevented.
- [ ] Parser/state tests are hermetic.
- [ ] Frontend and Rust checks pass.
- [ ] The Windows flow is visually verified in the real desktop app.

# Relevant files

- `AGENTS.md`
- `DESIGN.md`
- `docs/ARCHITECTURE.md`
- `src-tauri/src/lib.rs`
- `src/main.tsx`

# Dependencies

- Task 002 provides the version and update prototype.
- Task 004 owns missing-Git installation behavior.

# Decisions

- Network-dependent diagnostics belong behind explicit user intent.
- Isolate any tolerant `winget` output detection behind tests.

# Implementation notes

The existing `check_git_update` and `update_git` commands remain until this task refactors them.

# Validation

Not run yet.
