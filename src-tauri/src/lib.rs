#![allow(linker_messages)]

use std::io::ErrorKind;
use std::path::Path;
use std::process::{Command, Output};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

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
struct InstallGitResult {
    /// True once an installer has been launched (e.g. via the OS package
    /// manager) and is running on its own; the app doesn't track completion.
    started: bool,
    /// Set when there's no in-app install path available, so the frontend
    /// should open this URL in the user's browser instead.
    fallback_url: Option<String>,
}

#[tauri::command]
fn install_git() -> InstallGitResult {
    #[cfg(target_os = "windows")]
    {
        // Deliberately not silenced with CREATE_NO_WINDOW: installing software
        // should stay visible (winget's progress, any UAC prompt), unlike the
        // quick read-only git subcommands elsewhere in this file.
        let spawned = Command::new("winget")
            .args([
                "install",
                "--id",
                "Git.Git",
                "-e",
                "--accept-package-agreements",
                "--accept-source-agreements",
            ])
            .spawn();

        match spawned {
            Ok(_) => InstallGitResult {
                started: true,
                fallback_url: None,
            },
            Err(_) => InstallGitResult {
                started: false,
                fallback_url: Some(GIT_DOWNLOAD_URL.to_string()),
            },
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        InstallGitResult {
            started: false,
            fallback_url: Some(GIT_DOWNLOAD_URL.to_string()),
        }
    }
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
            install_git
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
}
