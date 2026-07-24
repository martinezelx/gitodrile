---
id: 003
title: Expand Settings with Git identity, startup, and safety controls
status: active
priority: normal
type: feature
areas:
  - rust
  - frontend
created: 2026-07-24
completed:
---

# Goal

Grow Settings beyond Appearance/General with three concrete, independently useful sections: Git identity (name/email used for saved versions), startup behavior (reopen last project), and a safety confirmation before closing a project.

# User outcome

A user can tell GitOdrile who they are for the commits it will eventually create, does not have to re-open their project by hand every time they launch the app, and gets a chance to back out if they click "Close project" by mistake.

# Context

`docs/PRODUCT_STRATEGY.md` names GitHub Desktop, GitButler, Fork, Tower, and GitKraken as the competitive set to study. All of them expose Git identity (name/email) and startup/session behavior in Settings; most also gate destructive-ish actions behind a confirmation, matching this project's own "Safety before cleverness" principle in `AGENTS.md`.

The user picked three areas to build now, out of a broader comparison: Git identity, safety confirmations, and startup behavior. External editor/terminal integration was explicitly deferred — there is no flow yet that opens files externally, so it would have no consumer.

Two of the three chosen areas needed narrowing to stay concrete instead of speculative:

- "Safety confirmations" has no destructive action to attach to yet (no discard, no delete, no history rewrite — none of that exists in the app). The only real candidate today is "Close project", which isn't destructive (it doesn't delete anything) but is the one action a confirmation can meaningfully guard right now. Scoped to that single action rather than building a general confirmation framework with no other consumer.
- "Startup behavior" (reopen last project) depends on remembering the last opened project. `work/backlog.md` lists "Persist and reopen recent projects" separately under Foundation, implying a fuller recent-projects list/UI. This task only persists the single last-opened path (localStorage, not Rust-side) to support one toggle — it is not the full recent-projects feature.

# Scope

- Rust: `get_git_identity` (reads global `user.name`/`user.email` via `git config --global --get`, each independently optional/unset) and `set_git_identity(name, email)` (writes both via `git config --global`).
- Settings → new "Git identity" section: two text inputs (name, email) pre-filled from `get_git_identity`, a Save button, and a short explanation that this is used to sign saved versions and is a normal global Git setting, not a GitOdrile-only preference.
- Frontend: persist the path of the most recently opened project in `localStorage` whenever `open_repository` succeeds.
- Settings → new "Startup" section: a toggle "Reopen last project on launch". When enabled and a stored path exists, the app calls `open_repository` with it once on launch; a failure (folder moved/deleted/no longer a repo) is handled the same as any other open failure — silently cleared, no error toast on launch.
- Settings → new "Safety" section: a toggle "Confirm before closing a project" (default on). When enabled, clicking "Close project" (from Overview or the command palette) shows a confirmation dialog before actually clearing the open project; when disabled, it closes immediately as it does today.

# Out of scope

- Per-repository Git identity overrides (`user.name`/`user.email` scoped to one repo instead of global).
- A full recent-projects list/switcher (`work/backlog.md`, Foundation) — only the single last-opened path needed for the startup toggle.
- Confirmations for any other action (there are no other destructive actions implemented yet).
- External editor/terminal integration — explicitly deferred by the user.
- Validating email format beyond "non-empty" — Git itself doesn't require a syntactically valid email.

# Acceptance criteria

- [x] `get_git_identity`/`set_git_identity` Rust commands exist, don't shell out through `/bin/sh`/`cmd`, and are covered by simple tests (parsing/round-trip against a temp global config, or an equivalent isolation strategy that doesn't mutate the real machine's global Git config).
- [x] Settings shows the current global name/email (or empty state) and can save new values.
- [x] The last successfully opened project's path is persisted locally.
- [x] With the startup toggle on, relaunching auto-opens the last project if it's still valid; if it isn't, the app falls back to the normal empty state without an error toast.
- [x] With the safety toggle on (default), closing a project asks for confirmation first; with it off, closing is immediate.
- [x] The required frontend and Rust checks pass.
- [ ] Visually verified in the real desktop app: saving identity, the startup auto-reopen (including the stale-path fallback), and the close confirmation.

# Relevant files

- `AGENTS.md`
- `DESIGN.md`
- `docs/PRODUCT_STRATEGY.md`
- `work/backlog.md`
- `src-tauri/src/lib.rs`
- `src/main.tsx`
- `src/styles.css`

# Dependencies

- Builds on the `git_command`/`base_git_command` process-spawning pattern from tasks 001/002.

# Decisions

- Global-only identity, no per-repo override — matches this task's scope; per-repo identity is a plausible later task, not bundled here.
- Reopen-on-launch persists only the last path in `localStorage`, not a full recent-projects list — keeps this task independent of the separate, unbuilt "Persist and reopen recent projects" backlog item.
- The only confirmation built now guards "Close project" — the sole existing action a confirmation can attach to; a general confirmation framework for hypothetical future destructive actions was rejected as speculative.

# Implementation notes

- `src-tauri/src/lib.rs`: added `get_git_identity`/`set_git_identity` Tauri commands, backed by `read_global_git_config`/`write_global_git_config` helpers that shell out to `git config --global [--get] <key>`. Both accept an optional `config_override` (sets `GIT_CONFIG_GLOBAL` on the child process) so tests can round-trip through a temporary config file instead of touching the real machine's `~/.gitconfig`; production commands always pass `None`. `set_git_identity` rejects blank name/email with a plain-language error before touching git.
- `src/main.tsx`: `SettingsPanel` gained three sections — "Git identity" (two text inputs pre-filled from `get_git_identity`, Save button, inline save/error message), "Startup" (`ToggleSwitch` for "Reopen last project on launch"), and "Safety" (`ToggleSwitch` for "Confirm before closing a project"). Added a small reusable `ToggleSwitch` component (`role="switch"`, click toggles a boolean) styled in `src/styles.css` (`.toggle-switch`).
- `App`: persists the opened project's path to `localStorage` (`gitodrile-last-project-path`) on every successful `open_repository`; a one-time effect on mount auto-calls `open_repository` with that stored path when the reopen-last-project toggle is on, clearing the stored path silently (no error toast) if it fails. "Close project" (Overview button and command palette) now goes through `requestCloseProject`, which opens a confirmation dialog (same visual pattern as the existing About dialog, with Escape/focus handling) when the safety toggle is on, or closes immediately when it's off; closing also clears the stored last-project path so a disabled/declined reopen doesn't linger.
- `src/styles.css`: added `.identity-fields`/`.text-field` (two-column on desktop, single column under 800px), `.toggle-switch` (+`--on` state), `.settings-section__footer`, and `.dialog-actions`.

# Validation

- `cargo fmt -- --check` — pass.
- `cargo clippy --all-targets --all-features -- -D warnings` — pass, no warnings.
- `cargo test` — 10 passed, 0 failed (2 new: `git_identity_round_trips_through_a_temporary_global_config`, `set_git_identity_rejects_empty_fields`; both use `GIT_CONFIG_GLOBAL` overrides pointed at a temp file, never the real global config).
- `npm run typecheck` — pass.
- `npm run test` — pass (no test files yet, same as before this task).
- `npm run build` — pass.
- Verified in the browser preview (`npm run dev`, outside Tauri): all four new sections render with the expected copy; toggling "Reopen last project on launch" flips `aria-checked` and persists `gitodrile-reopen-last-project`/`gitodrile-confirm-close-project` in `localStorage`; saving Git identity without a Tauri backend fails gracefully with "Couldn't save that." (no crash, no console error) — the same graceful-outside-Tauri pattern as the existing Install Git button.
- **Not yet done:** the last acceptance criterion (real desktop app: identity actually written to `~/.gitconfig`, startup auto-reopen including the stale-path fallback, and the close-confirmation dialog) — needs a run of the real Tauri app, same as the outstanding items on tasks 001/002.
