#![allow(linker_messages)]

use std::io::ErrorKind;
use std::path::Path;
use std::process::{Command, Output};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;
#[cfg(target_os = "windows")]
const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

fn base_git_command() -> Command {
    let mut command = Command::new("git");
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

fn git_command(repo_path: &str) -> Command {
    let mut command = base_git_command();
    command.arg("-C").arg(repo_path);
    command
}

fn run_git(repo_path: &str, args: &[&str]) -> Result<Output, String> {
    git_command(repo_path).args(args).output().map_err(|error| {
        if error.kind() == ErrorKind::NotFound {
            "Git isn't installed, or isn't on your PATH. Install Git and try again.".to_string()
        } else {
            "Couldn't run git.".to_string()
        }
    })
}

fn git_stdout(output: &Output) -> String {
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct RepositoryInfo {
    name: String,
    path: String,
    branch: String,
    kind: RepositoryKind,
    status_message: String,
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "lowercase")]
enum RepositoryKind {
    Repository,
    Worktree,
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GitDiagnostics {
    installed: bool,
    version: Option<String>,
}

fn parse_git_version(raw_version_output: &str) -> String {
    raw_version_output
        .trim()
        .strip_prefix("git version ")
        .unwrap_or(raw_version_output.trim())
        .to_string()
}

#[tauri::command]
fn app_status() -> &'static str {
    "GitOdrile is ready"
}

#[tauri::command]
fn open_repository(path: String) -> Result<RepositoryInfo, String> {
    let repo_path = Path::new(&path);
    if !repo_path.is_dir() {
        return Err("That folder doesn't exist.".to_string());
    }

    let is_repo = run_git(&path, &["rev-parse", "--is-inside-work-tree"])?;
    if !is_repo.status.success() {
        return Err("This folder isn't a Git repository.".to_string());
    }

    // A linked worktree's --git-dir (e.g. .git/worktrees/<name>) differs from
    // the --git-common-dir shared with the main checkout; a normal repository's
    // are the same path. This is the same check `git` itself relies on.
    let git_dir = git_stdout(&run_git(&path, &["rev-parse", "--git-dir"])?);
    let common_dir = git_stdout(&run_git(&path, &["rev-parse", "--git-common-dir"])?);
    let kind = if git_dir == common_dir {
        RepositoryKind::Repository
    } else {
        RepositoryKind::Worktree
    };

    let branch = git_stdout(&run_git(&path, &["branch", "--show-current"])?);
    let branch = if branch.is_empty() {
        "detached HEAD".to_string()
    } else {
        branch
    };

    let name = repo_path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    let status_message = match kind {
        RepositoryKind::Repository => format!("This is a Git repository on branch {branch}."),
        RepositoryKind::Worktree => format!("This is a linked worktree on branch {branch}."),
    };

    Ok(RepositoryInfo {
        name,
        path,
        branch,
        kind,
        status_message,
    })
}

#[tauri::command]
fn git_diagnostics() -> GitDiagnostics {
    match base_git_command().arg("--version").output() {
        Ok(output) if output.status.success() => GitDiagnostics {
            installed: true,
            version: Some(parse_git_version(&git_stdout(&output))),
        },
        _ => GitDiagnostics {
            installed: false,
            version: None,
        },
    }
}

const GIT_DOWNLOAD_URL: &str = "https://git-scm.com/downloads";

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct WingetActionResult {
    /// True once winget has been launched (install or upgrade) and is
    /// running on its own; the app doesn't track completion.
    started: bool,
    /// Set when there's no in-app path available, so the frontend should
    /// open this URL in the user's browser instead.
    fallback_url: Option<String>,
}

/// Spawns (never awaits) a winget subcommand. Deliberately not silenced with
/// CREATE_NO_WINDOW: installing/updating software should stay visible
/// (winget's progress, any UAC prompt), unlike the quick read-only git
/// subcommands elsewhere in this file.
fn spawn_winget(args: &[&str]) -> WingetActionResult {
    #[cfg(target_os = "windows")]
    {
        // GitOdrile itself may or may not have its own console (hidden in
        // release, visible in debug — see main.rs), so relying on console
        // inheritance would make winget's window show up inconsistently, or
        // not at all, instead of a dedicated window every time.
        let mut command = Command::new("winget");
        command.args(args).creation_flags(CREATE_NEW_CONSOLE);
        match command.spawn() {
            Ok(_) => WingetActionResult {
                started: true,
                fallback_url: None,
            },
            Err(_) => WingetActionResult {
                started: false,
                fallback_url: Some(GIT_DOWNLOAD_URL.to_string()),
            },
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = args;
        WingetActionResult {
            started: false,
            fallback_url: Some(GIT_DOWNLOAD_URL.to_string()),
        }
    }
}

#[tauri::command]
fn install_git() -> WingetActionResult {
    spawn_winget(&[
        "install",
        "--id",
        "Git.Git",
        "-e",
        "--accept-package-agreements",
        "--accept-source-agreements",
    ])
}

#[tauri::command]
fn update_git() -> WingetActionResult {
    spawn_winget(&[
        "upgrade",
        "--id",
        "Git.Git",
        "-e",
        "--accept-package-agreements",
        "--accept-source-agreements",
    ])
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GitUpdateStatus {
    /// False if the check itself couldn't run (e.g. no winget on this
    /// machine/platform) — distinct from "checked and no update found".
    checked: bool,
    update_available: bool,
}

#[tauri::command]
fn check_git_update() -> GitUpdateStatus {
    #[cfg(target_os = "windows")]
    {
        let mut command = Command::new("winget");
        command.args(["upgrade", "--accept-source-agreements"]);
        command.creation_flags(CREATE_NO_WINDOW);

        match command.output() {
            // winget's `upgrade` (no --id) lists every package with a pending
            // update. Checking whether "Git.Git" appears in that listing is a
            // simple, version/locale-tolerant way to answer "is there an
            // update for Git specifically" without parsing winget's table
            // output column-by-column.
            Ok(output) => GitUpdateStatus {
                checked: true,
                update_available: git_stdout(&output).contains("Git.Git"),
            },
            Err(_) => GitUpdateStatus {
                checked: false,
                update_available: false,
            },
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        GitUpdateStatus {
            checked: false,
            update_available: false,
        }
    }
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct GitIdentity {
    name: Option<String>,
    email: Option<String>,
}

// `config_override`, when set, points git at an alternate global config file
// via `GIT_CONFIG_GLOBAL` (a real git env var, supported since Git 2.32).
// Production calls always pass `None` (the user's real global config); tests
// pass a temporary file so they never touch the machine's real Git identity.
fn read_global_git_config(key: &str, config_override: Option<&str>) -> Option<String> {
    let mut command = base_git_command();
    if let Some(path) = config_override {
        command.env("GIT_CONFIG_GLOBAL", path);
    }
    let output = command
        .args(["config", "--global", "--get", key])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let value = git_stdout(&output);
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn write_global_git_config(
    key: &str,
    value: &str,
    config_override: Option<&str>,
) -> Result<(), String> {
    let mut command = base_git_command();
    if let Some(path) = config_override {
        command.env("GIT_CONFIG_GLOBAL", path);
    }
    let status = command
        .args(["config", "--global", key, value])
        .status()
        .map_err(|_| "Couldn't run git.".to_string())?;
    if !status.success() {
        return Err(format!("Couldn't save {key}."));
    }
    Ok(())
}

fn set_git_identity_with_override(
    name: &str,
    email: &str,
    config_override: Option<&str>,
) -> Result<(), String> {
    let name = name.trim();
    let email = email.trim();
    if name.is_empty() || email.is_empty() {
        return Err("Enter both a name and an email.".to_string());
    }

    write_global_git_config("user.name", name, config_override)?;
    write_global_git_config("user.email", email, config_override)?;
    Ok(())
}

#[tauri::command]
fn get_git_identity() -> GitIdentity {
    GitIdentity {
        name: read_global_git_config("user.name", None),
        email: read_global_git_config("user.email", None),
    }
}

#[tauri::command]
fn set_git_identity(name: String, email: String) -> Result<(), String> {
    set_git_identity_with_override(&name, &email, None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_status,
            open_repository,
            git_diagnostics,
            install_git,
            update_git,
            check_git_update,
            get_git_identity,
            set_git_identity
        ])
        .run(tauri::generate_context!())
        .expect("error while running GitOdrile");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn unique_temp_dir(label: &str) -> String {
        let mut dir = std::env::temp_dir();
        dir.push(format!("gitodrile-test-{label}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("create temp dir for test");
        dir.to_string_lossy().to_string()
    }

    fn git_init(path: &str) {
        let status = git_command(path)
            .args(["init", "-q"])
            .status()
            .expect("run git init");
        assert!(status.success(), "git init should succeed");
    }

    fn git_commit_empty(path: &str) {
        let status = git_command(path)
            .args([
                "-c",
                "user.name=GitOdrile Test",
                "-c",
                "user.email=test@gitodrile.local",
                "commit",
                "--allow-empty",
                "-q",
                "-m",
                "init",
            ])
            .status()
            .expect("run git commit");
        assert!(status.success(), "git commit --allow-empty should succeed");
    }

    #[test]
    fn open_repository_recognizes_a_valid_repository() {
        let path = unique_temp_dir("valid-repo");
        git_init(&path);

        let info = open_repository(path.clone()).expect("a git init'd folder should open");
        assert!(matches!(info.kind, RepositoryKind::Repository));
        assert_eq!(info.path, path);

        let _ = fs::remove_dir_all(&path);
    }

    #[test]
    fn open_repository_rejects_a_non_repository_folder() {
        let path = unique_temp_dir("non-repo");

        let error = open_repository(path.clone()).expect_err("a plain folder isn't a repo");
        assert_eq!(error, "This folder isn't a Git repository.");

        let _ = fs::remove_dir_all(&path);
    }

    #[test]
    fn open_repository_rejects_a_missing_folder() {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "gitodrile-test-does-not-exist-{}",
            std::process::id()
        ));
        let path = path.to_string_lossy().to_string();

        let error = open_repository(path).expect_err("a missing folder can't be opened");
        assert_eq!(error, "That folder doesn't exist.");
    }

    #[test]
    fn open_repository_detects_a_linked_worktree() {
        let main_path = unique_temp_dir("worktree-main");
        git_init(&main_path);
        git_commit_empty(&main_path);

        let mut worktree_buf = std::env::temp_dir();
        worktree_buf.push(format!(
            "gitodrile-test-worktree-linked-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&worktree_buf);
        let worktree_path = worktree_buf.to_string_lossy().to_string();

        let status = git_command(&main_path)
            .args([
                "worktree",
                "add",
                "-q",
                &worktree_path,
                "-b",
                "gitodrile-test-branch",
            ])
            .status()
            .expect("run git worktree add");
        assert!(status.success(), "git worktree add should succeed");

        let info = open_repository(worktree_path.clone()).expect("the linked worktree should open");
        assert!(matches!(info.kind, RepositoryKind::Worktree));

        let _ = git_command(&main_path)
            .args(["worktree", "remove", "--force", &worktree_path])
            .status();
        let _ = fs::remove_dir_all(&main_path);
        let _ = fs::remove_dir_all(&worktree_path);
    }

    #[test]
    fn git_diagnostics_finds_the_system_git() {
        // Assumes the machine running the tests has git on PATH, same as
        // every other test in this module (they all shell out to git).
        let diagnostics = git_diagnostics();
        assert!(diagnostics.installed);
        assert!(diagnostics.version.is_some());
    }

    #[test]
    fn parse_git_version_strips_the_leading_label() {
        assert_eq!(
            parse_git_version("git version 2.43.0.windows.1\n"),
            "2.43.0.windows.1"
        );
        assert_eq!(parse_git_version("2.43.0"), "2.43.0");
    }

    #[test]
    fn git_identity_round_trips_through_a_temporary_global_config() {
        let mut config_path = std::env::temp_dir();
        config_path.push(format!("gitodrile-test-gitconfig-{}", std::process::id()));
        let _ = fs::remove_file(&config_path);
        let config_override = config_path.to_string_lossy().to_string();

        assert_eq!(
            read_global_git_config("user.name", Some(&config_override)),
            None
        );

        set_git_identity_with_override("Ada Lovelace", "ada@example.com", Some(&config_override))
            .expect("set identity should succeed");

        assert_eq!(
            read_global_git_config("user.name", Some(&config_override)),
            Some("Ada Lovelace".to_string())
        );
        assert_eq!(
            read_global_git_config("user.email", Some(&config_override)),
            Some("ada@example.com".to_string())
        );

        let _ = fs::remove_file(&config_path);
    }

    #[test]
    fn set_git_identity_rejects_empty_fields() {
        let error = set_git_identity_with_override(" ", "ada@example.com", None)
            .expect_err("empty name should be rejected");
        assert_eq!(error, "Enter both a name and an email.");
    }
}
