import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./styles.css";

type ThemePreference = "system" | "light" | "dark";
type View = "overview" | "settings";
type RepositoryInfo = {
  name: string;
  path: string;
  branch: string;
  kind: "repository" | "worktree";
  statusMessage: string;
};
type GitDiagnostics = { installed: boolean; version: string | null };
type InstallGitResult = { started: boolean; fallbackUrl: string | null };

const THEME_STORAGE_KEY = "gitodrile-theme";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "gitodrile-sidebar-collapsed";
const APP_VERSION = "0.1.0";

function readStoredTheme(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function applyTheme(theme: ThemePreference): void {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}

const THEME_ICONS: Record<ThemePreference, React.JSX.Element> = {
  system: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  ),
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const THEME_ORDER: ThemePreference[] = ["system", "light", "dark"];

const NAV_ICONS = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
  changes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1-4L15 6l3 3L8 19l-4 1Z" /><path d="M13 8l3 3" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </svg>
  ),
  recovery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v5h5" /><path d="M4.6 15a7.5 7.5 0 1 0 1.7-8.2L4 9" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" />
      <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" />
      <line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="18" r="2" />
    </svg>
  ),
  collapse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" /><path d="M14 4v16" /><path d="M11 10l-2 2 2 2" />
    </svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" /><path d="M14 4v16" /><path d="M12 10l2 2-2 2" />
    </svg>
  ),
} as const;

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
  </svg>
);

type Command = { id: string; label: string; hint?: string; action: () => void };

function CommandPalette({
  isOpen,
  onClose,
  commands,
}: {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}): React.JSX.Element | null {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const runCommand = (command: Command | undefined): void => {
    if (!command) {
      return;
    }
    command.action();
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      runCommand(filtered[selectedIndex]);
    }
  };

  return (
    <div className="palette-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="palette-input-row">
          <span aria-hidden="true">{SEARCH_ICON}</span>
          <input
            ref={inputRef}
            className="palette-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            placeholder="Jump to a view or action…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <ul className="palette-list" id="palette-list" role="listbox">
          {filtered.length === 0 && <li className="palette-empty">No matching commands</li>}
          {filtered.map((command, index) => (
            <li
              key={command.id}
              role="option"
              aria-selected={index === selectedIndex}
              className="palette-item"
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand(command);
              }}
            >
              {command.label}
              {command.hint && <span className="palette-item__hint">{command.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const FOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" />
  </svg>
);

function OverviewPanel({
  project,
  openError,
  isOpening,
  onOpenProject,
  onCloseProject,
}: {
  project: RepositoryInfo | null;
  openError: string | null;
  isOpening: boolean;
  onOpenProject: () => void;
  onCloseProject: () => void;
}): React.JSX.Element {
  if (project) {
    return (
      <div className="project-summary">
        <div className="project-summary__icon" aria-hidden="true">{FOLDER_ICON}</div>
        <div className="project-summary__body">
          <h2>
            {project.name}
            {project.kind === "worktree" && <span className="project-summary__badge">Worktree</span>}
          </h2>
          <p className="project-summary__meta">{project.statusMessage}</p>
          <p className="project-summary__path">{project.path}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onCloseProject}>
          Close project
        </button>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">{FOLDER_ICON}</div>
      <h2>No project open</h2>
      <p>Open a Git project to review changes, save versions, publish work, and recover from mistakes.</p>
      {openError && <p className="empty-state__error">{openError}</p>}
      <div className="empty-state__actions">
        <button className="primary-button" type="button" onClick={onOpenProject} disabled={isOpening}>
          {isOpening ? "Opening…" : "Open a project"}
        </button>
        <button className="secondary-button" type="button" disabled title="Coming soon">
          Clone from GitHub
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  theme,
  setTheme,
  onOpenAbout,
  gitDiagnostics,
}: {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  onOpenAbout: () => void;
  gitDiagnostics: GitDiagnostics | null;
}): React.JSX.Element {
  const [installGitMessage, setInstallGitMessage] = useState<string | null>(null);

  const handleInstallGit = async (): Promise<void> => {
    setInstallGitMessage(null);
    try {
      const result = await invoke<InstallGitResult>("install_git");
      if (result.fallbackUrl) {
        await openUrl(result.fallbackUrl);
        setInstallGitMessage("Opened the official download page in your browser.");
      } else {
        setInstallGitMessage("Installer launched — once it finishes, reopen GitOdrile to detect Git.");
      }
    } catch {
      setInstallGitMessage("Couldn't start the installer.");
    }
  };

  return (
    <div className="settings-view">
      <section className="settings-section">
        <div className="settings-section__heading">
          <h2>Appearance</h2>
          <p>Choose how GitOdrile looks. "System" follows your OS setting automatically.</p>
        </div>
        <div className="segmented-control" role="radiogroup" aria-label="Theme">
          {THEME_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={theme === option}
              className={`segmented-control__option${theme === option ? " segmented-control__option--active" : ""}`}
              onClick={() => setTheme(option)}
            >
              <span aria-hidden="true">{THEME_ICONS[option]}</span>
              {THEME_LABELS[option]}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__heading">
          <h2>General</h2>
          <p>Application information and diagnostics.</p>
        </div>
        <div className="settings-row">
          <div>
            <strong>Version</strong>
            <p>GitOdrile {APP_VERSION}</p>
          </div>
          <button className="secondary-button" type="button" onClick={onOpenAbout}>
            View about
          </button>
        </div>
        <div className="settings-row">
          <div>
            <strong>Git</strong>
            {gitDiagnostics === null && <p>Checking…</p>}
            {gitDiagnostics?.installed && <p>{gitDiagnostics.version}</p>}
            {gitDiagnostics && !gitDiagnostics.installed && (
              <p className="settings-row__warning">Not detected.</p>
            )}
            {installGitMessage && <p className="settings-row__hint">{installGitMessage}</p>}
          </div>
          {gitDiagnostics && !gitDiagnostics.installed && (
            <button className="secondary-button" type="button" onClick={() => void handleInstallGit()}>
              Install Git
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function App(): React.JSX.Element {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [theme, setTheme] = useTheme();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true",
  );
  const [project, setProject] = useState<RepositoryInfo | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [gitDiagnostics, setGitDiagnostics] = useState<GitDiagnostics | null>(null);
  const aboutDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    invoke<GitDiagnostics>("git_diagnostics")
      .then(setGitDiagnostics)
      .catch(() => setGitDiagnostics({ installed: false, version: null }));
  }, []);

  const handleOpenProject = async (): Promise<void> => {
    setOpenError(null);
    try {
      const selected = await openFolderDialog({ directory: true, multiple: false, title: "Open a Git project" });
      if (!selected || Array.isArray(selected)) {
        return;
      }
      setIsOpening(true);
      const info = await invoke<RepositoryInfo>("open_repository", { path: selected });
      setProject(info);
    } catch (error) {
      setOpenError(typeof error === "string" ? error : "Couldn't open that folder.");
    } finally {
      setIsOpening(false);
    }
  };

  useEffect(() => {
    if (!isAboutOpen) {
      return undefined;
    }

    aboutDialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsAboutOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAboutOpen]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const commands: Command[] = [
    { id: "go-overview", label: "Go to Overview", action: () => setView("overview") },
    { id: "go-settings", label: "Go to Settings", action: () => setView("settings") },
    ...(project
      ? [{ id: "close-project", label: "Close project", action: () => setProject(null) }]
      : [{ id: "open-project", label: "Open a project", action: () => void handleOpenProject() }]),
    { id: "theme-system", label: "Use system theme", action: () => setTheme("system") },
    { id: "theme-light", label: "Use light theme", action: () => setTheme("light") },
    { id: "theme-dark", label: "Use dark theme", action: () => setTheme("dark") },
    {
      id: "toggle-sidebar",
      label: isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar",
      action: () => setIsSidebarCollapsed((collapsed) => !collapsed),
    },
    { id: "about", label: "About GitOdrile", action: () => setIsAboutOpen(true) },
  ];

  const appWindow = "__TAURI_INTERNALS__" in window
    ? getCurrentWindow()
    : { minimize: async () => {}, toggleMaximize: async () => {}, close: async () => {} };
  const performWindowAction = (action: () => Promise<void>): void => {
    void action().catch(() => undefined);
  };

  return (
    <div className="app-window">
      <header className="window-titlebar">
        <div
          className="window-titlebar__drag window-titlebar__drag--left"
          data-tauri-drag-region
          onDoubleClick={() => performWindowAction(() => appWindow.toggleMaximize())}
        >
          <div className="window-titlebar__brand" data-tauri-drag-region>
            <span className="window-titlebar__mark" aria-hidden="true">G</span>
            <span className="window-titlebar__name" data-tauri-drag-region>GitOdrile</span>
          </div>
        </div>

        <div className="window-titlebar__center">
          <button
            className="command-trigger"
            type="button"
            aria-label="Open command palette"
            title="Jump to a view or action"
            onClick={() => setIsPaletteOpen(true)}
          >
            <span aria-hidden="true">{SEARCH_ICON}</span>
            <span>Jump to…</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        <div className="window-titlebar__right">
          <div
            className="window-titlebar__drag window-titlebar__drag--right"
            data-tauri-drag-region
            onDoubleClick={() => performWindowAction(() => appWindow.toggleMaximize())}
          />
          <div className="window-controls" aria-label="Window controls">
            <button
              className="window-control"
              type="button"
              aria-label="Minimize window"
              onClick={() => performWindowAction(() => appWindow.minimize())}
            >
              <span aria-hidden="true">−</span>
            </button>
            <button
              className="window-control"
              type="button"
              aria-label="Maximize or restore window"
              onClick={() => performWindowAction(() => appWindow.toggleMaximize())}
            >
              <span className="window-control__maximize" aria-hidden="true" />
            </button>
            <button
              className="window-control window-control--close"
              type="button"
              aria-label="Close window"
              onClick={() => performWindowAction(() => appWindow.close())}
            >
              <span className="window-control__close" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main className={`app-shell${isSidebarCollapsed ? " app-shell--collapsed" : ""}`}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">G</div>
            {!isSidebarCollapsed && (
              <div>
                <strong>GitOdrile</strong>
                <span>Git without the bite</span>
              </div>
            )}
          </div>

          <nav aria-label="Project navigation">
            <button
              className={`nav-item${view === "overview" ? " nav-item--active" : ""}`}
              type="button"
              aria-current={view === "overview" ? "page" : undefined}
              title="Overview"
              onClick={() => setView("overview")}
            >
              <span className="nav-item__icon" aria-hidden="true">{NAV_ICONS.overview}</span>
              <span className="nav-item__label">Overview</span>
            </button>
            <button className="nav-item" type="button" disabled title="Changes — Coming soon">
              <span className="nav-item__icon" aria-hidden="true">{NAV_ICONS.changes}</span>
              <span className="nav-item__label">Changes</span>
            </button>
            <button className="nav-item" type="button" disabled title="History — Coming soon">
              <span className="nav-item__icon" aria-hidden="true">{NAV_ICONS.history}</span>
              <span className="nav-item__label">History</span>
            </button>
            <button className="nav-item" type="button" disabled title="Recovery — Coming soon">
              <span className="nav-item__icon" aria-hidden="true">{NAV_ICONS.recovery}</span>
              <span className="nav-item__label">Recovery</span>
            </button>
          </nav>

          <nav aria-label="Application" className="nav--secondary">
            <button
              className={`nav-item${view === "settings" ? " nav-item--active" : ""}`}
              type="button"
              aria-current={view === "settings" ? "page" : undefined}
              title="Settings"
              onClick={() => setView("settings")}
            >
              <span className="nav-item__icon" aria-hidden="true">{NAV_ICONS.settings}</span>
              <span className="nav-item__label">Settings</span>
            </button>
            <button
              className="nav-item"
              type="button"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            >
              <span className="nav-item__icon" aria-hidden="true">
                {isSidebarCollapsed ? NAV_ICONS.expand : NAV_ICONS.collapse}
              </span>
              <span className="nav-item__label">Collapse</span>
            </button>
          </nav>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <h1>{view === "overview" ? "Overview" : "Settings"}</h1>
          </header>

          {view === "overview" ? (
            <OverviewPanel
              project={project}
              openError={openError}
              isOpening={isOpening}
              onOpenProject={() => void handleOpenProject()}
              onCloseProject={() => setProject(null)}
            />
          ) : (
            <SettingsPanel
              theme={theme}
              setTheme={setTheme}
              onOpenAbout={() => setIsAboutOpen(true)}
              gitDiagnostics={gitDiagnostics}
            />
          )}
        </section>
      </main>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={commands} />

      {isAboutOpen && (
        <div className="about-backdrop" role="presentation" onMouseDown={() => setIsAboutOpen(false)}>
          <div
            ref={aboutDialogRef}
            className="about-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="about-dialog__mark" aria-hidden="true">G</div>
            <p className="eyebrow">About GitOdrile</p>
            <h2 id="about-title">Git without the bite.</h2>
            <p>
              GitOdrile is a friendly desktop Git client that turns version control
              into clear, safe steps.
            </p>
            <dl className="about-details">
              <div><dt>Version</dt><dd>{APP_VERSION}</dd></div>
              <div><dt>Built with</dt><dd>Tauri, React, and Rust</dd></div>
            </dl>
            <button className="primary-button" type="button" onClick={() => setIsAboutOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
