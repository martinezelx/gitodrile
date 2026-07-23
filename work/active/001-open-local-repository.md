---
id: 001
title: Open and validate a local repository
status: active
priority: high
type: feature
areas:
  - rust
  - frontend
  - platform
created: 2026-07-23
completed:
---

# Goal

Allow the user to select a local folder and determine safely whether it belongs to a valid Git repository or worktree.

# User outcome

A user can open an existing project without using the terminal and receives a clear explanation when the selected folder is not usable.

# Context

This is the first vertical slice connecting the React interface, Tauri command boundary, Rust application layer, system Git, and platform-native folder selection.

The implementation must establish patterns that later repository operations can reuse. Keep Git execution and parsing outside visual components.

# Scope

- Add a native folder-selection flow.
- Validate the selected path in Rust.
- Detect a normal repository and a linked worktree.
- Return structured repository information to React.
- Display project name, absolute path, worktree type, current branch when available, and a plain-language status message.
- Provide loading, cancellation, invalid-folder, Git-missing, and unexpected-error states.

# Out of scope

- Cloning repositories.
- Persisting recent projects.
- Full working-tree status or diff parsing.
- Authentication and remote-provider integration.
- Saving versions, fetch, pull, or push.
- Designing the final onboarding experience.
- Detecting/reporting the installed Git version — its own task, see `work/done/002-detect-git-version.md`.
- The full integration-test matrix from `docs/ARCHITECTURE.md` (ahead/behind, merge conflict, non-ASCII paths, etc.) — only enough to cover what this task actually builds.

# Acceptance criteria

- [x] The user can invoke a native folder picker from the existing interface.
- [x] Cancelling the picker leaves the current state unchanged and is not shown as an error.
- [x] Validation and Git execution happen in Rust, not in React.
- [x] Normal repositories and linked worktrees are recognized.
- [x] A non-repository folder produces a structured, understandable error.
- [x] Missing or unusable Git produces a structured diagnostic with remediation guidance.
- [x] React receives typed repository data rather than raw command output.
- [x] The primary result is explained in plain language, with exact Git details available secondarily.
- [x] Simple Rust tests cover valid repo, non-repo folder, missing folder, and linked-worktree detection using temporary repositories.
- [x] The required frontend and Rust checks pass.
- [ ] The "project open" state (Overview once `open_repository` succeeds) has been visually verified in the real desktop app against a real repository, a real linked worktree, and a real non-repo folder — not just inferred from a browser-only fallback check.

# Relevant files

- `AGENTS.md`
- `DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `work/README.md`
- `src/`
- `src-tauri/src/`

# Dependencies

- System Git is the initial Git implementation strategy.
- A Tauri dialog capability/plugin may be introduced if required; keep permissions minimal and explicit.

# Decisions

- This task should define a structured command/result boundary that later Git features can extend.
- Do not expose raw stderr as the main user-facing message.
- **Scope trim (agreed with user), later corrected:** "detect and report the installed Git version" was first dropped from this task, on the grounds that `work/README.md`'s own naming example already treats it as a separate task (`002-detect-git-version.md`), and `backlog.md` lists it under "Foundation" separately from "Open and validate a local Git repository" under "Repository experience". The user then confirmed the feature itself is still needed, just not inside *this* task — so it was promoted and built as `work/done/002-detect-git-version.md` right after this one, keeping the task granularity intact.
- **Scope trim, then partially reinstated:** automated tests were first deferred (see below), then the user asked for "some simple ones" while task 002 was underway. `open_repository`'s tests (valid repo, non-repo folder, missing folder, linked worktree) were added at that point, using real temporary Git repositories rather than mocks — see Implementation notes.
- The full integration-test matrix in `docs/ARCHITECTURE.md` (ahead/behind, merge conflict, non-ASCII paths, etc.) remains out of scope here — that's a testing strategy for the whole Git layer over time, and none of those scenarios are touched by what this task builds.
- Worktree vs. repository is determined by comparing `git rev-parse --git-dir` and `--git-common-dir`: equal means a normal repository, different means a linked worktree — the same check Git itself uses internally.

# Implementation notes

- `src-tauri/src/lib.rs`: added `open_repository(path)` Tauri command. Runs `git -C <path>` subcommands (no shell interpolation) to check `--is-inside-work-tree`, compare `--git-dir`/`--git-common-dir` for worktree detection, and read `branch --show-current`. Distinguishes "git executable not found" (`io::ErrorKind::NotFound`) from "folder isn't a repository" with separate, plain-language messages. On Windows, git is spawned with `CREATE_NO_WINDOW` so no console flashes.
- `src-tauri/Cargo.toml` / `capabilities/default.json`: added `tauri-plugin-dialog` and the single `dialog:allow-open` permission — nothing broader.
- `src/main.tsx`: "Open a project" opens the native folder picker (`@tauri-apps/plugin-dialog`), calls `open_repository`, and Overview renders a project summary (name, worktree badge when relevant, plain-language status message, path) on success, or an inline error on failure. Cancelling the picker resolves to `null`/no-op — no error shown. "Clone from GitHub" stays disabled ("Coming soon"); persisting recent projects is intentionally out of scope here.
- Command palette gained matching "Open a project" / "Close project" entries.
- `src-tauri/src/lib.rs` `#[cfg(test)] mod tests`: added while implementing task 002, covering `open_repository` — `open_repository_recognizes_a_valid_repository`, `open_repository_rejects_a_non_repository_folder`, `open_repository_rejects_a_missing_folder`, `open_repository_detects_a_linked_worktree`. Each creates/removes a real temporary Git repository (via `git init`, `git commit --allow-empty`, `git worktree add`) rather than mocking the process — no new test-only dependency.

# Validation

- `cargo fmt -- --check` — pass.
- `cargo clippy --all-targets --all-features -- -D warnings` — pass, no warnings.
- `cargo test` — pass (4 of the 6 tests in the module cover this task; the other 2 belong to task 002).
- `npm run typecheck` — pass.
- `npm run build` — pass.
- Native folder picker exercised by the user running the actual desktop app (`npm run tauri dev`) — the dialog itself isn't covered by the Rust tests since it's a native OS surface, not process logic.
