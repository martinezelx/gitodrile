---
id: 004
title: Make Git installation guided and platform-aware
status: active
priority: high
type: feature
areas:
  - rust
  - frontend
  - platform
created: 2026-07-24
completed:
---

# Goal

Turn the existing Git-install prototype into a clear, testable, platform-aware recovery path when Git is missing.

# User outcome

A user without Git can understand the problem and start the correct installation path without searching for instructions or mistaking an internal app failure for a missing dependency.

# Context

Task 002 added Git detection and a Windows `winget` prototype. Installation is a separate system-changing workflow with different platform behavior and failure modes.

# Scope

- Model Git diagnostics as distinct `available`, `missing`, `unusable`, and `check_failed` states.
- Keep installation explicitly user-triggered.
- Use a targeted `winget install --id Git.Git -e` path on supported Windows systems.
- Provide deliberate macOS and Linux guidance instead of presenting a generic download page as equivalent behavior.
- Expose a refresh/retry action after installation.
- Prevent duplicate installation launches.
- Add a process-runner seam so missing Git, missing `winget`, spawn failure, and fallback selection can be tested without installing software.
- Return typed errors/results rather than presentation strings.

# Out of scope

- Bundling a Git installer.
- Elevation or UAC automation.
- Selecting among multiple Git installations.
- Updating an existing Git installation; see task 005.

# Acceptance criteria

- [ ] Missing, unusable, and failed-to-check states are distinguishable in Rust and React.
- [ ] Windows installation is explicit, targeted, and cannot be launched repeatedly while starting.
- [ ] macOS and Linux present accurate platform-specific guidance.
- [ ] The user can re-check Git availability after installation.
- [ ] Process decisions are tested without triggering a real installer.
- [ ] Frontend and Rust checks pass.
- [ ] The flow is visually verified in the real desktop app.

# Relevant files

- `AGENTS.md`
- `DESIGN.md`
- `docs/ARCHITECTURE.md`
- `src-tauri/src/lib.rs`
- `src/main.tsx`

# Dependencies

- Task 002 provides the basic Git diagnostic and installation prototype.
- Task 001 provides the typed Rust-to-React error pattern.

# Decisions

- Installation is an explicit system mutation and must never start automatically.
- Test process planning rather than running a real installer in automated tests.

# Implementation notes

Preserve the current Windows prototype while improving state modeling and platform behavior.

# Validation

Not run yet.
