import React, { createContext, useContext, useEffect, useState } from "react";
import { locale as getOsLocale } from "@tauri-apps/plugin-os";

export type Language = "en" | "es";
export type LanguagePreference = "system" | Language;

const LANGUAGE_STORAGE_KEY = "gitodrile-language";

// Names of the languages themselves are shown in their own language
// regardless of the active UI language (so a user can always find their
// language), so they live outside the translated dictionary below.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  es: "Español",
};

// Pure on purpose: takes a raw locale string (from the OS, or
// navigator.language) and resolves it to one of the languages GitOdrile
// actually ships. Unknown languages fall back to English.
export function resolveLanguage(locale: string | null | undefined): Language {
  if (!locale) {
    return "en";
  }
  const primarySubtag = locale.split(/[-_]/)[0]?.toLowerCase();
  return primarySubtag === "es" ? "es" : "en";
}

export interface Translations {
  titlebarOpenCommandPalette: string;
  titlebarJumpToHint: string;
  titlebarJumpTo: string;
  windowMinimize: string;
  windowMaximize: string;
  windowClose: string;
  windowControls: string;

  brandTagline: string;
  sidebarCollapse: string;
  sidebarExpand: string;
  navProjectAriaLabel: string;
  navApplicationAriaLabel: string;
  navOverview: string;
  navChanges: string;
  navChangesTitle: string;
  navHistory: string;
  navHistoryTitle: string;
  navRecovery: string;
  navRecoveryTitle: string;
  navSettings: string;

  paletteAriaLabel: string;
  palettePlaceholder: string;
  paletteNoMatches: string;

  commandGoOverview: string;
  commandGoSettings: string;
  commandUseSystemTheme: string;
  commandUseLightTheme: string;
  commandUseDarkTheme: string;

  overviewWorktreeBadge: string;
  overviewCloseProject: string;
  overviewEmptyTitle: string;
  overviewEmptyDescription: string;
  overviewOpening: string;
  overviewOpenProject: string;
  overviewCloneComingSoonTitle: string;
  overviewCloneFromGithub: string;
  overviewOpenDialogTitle: string;
  overviewCouldntOpenFolder: string;

  settingsAppearanceTitle: string;
  settingsAppearanceDescription: string;
  themeAriaLabel: string;
  commonSystem: string;
  themeLight: string;
  themeDark: string;

  settingsGeneralTitle: string;
  settingsGeneralDescription: string;
  commonVersion: string;
  settingsGeneralViewAbout: string;
  settingsGeneralGitLabel: string;
  settingsGeneralChecking: string;
  settingsGeneralUpdateAvailable: string;
  settingsGeneralNotDetected: string;
  settingsGeneralInstallGit: string;
  settingsGeneralUpdate: string;
  gitInstallerLaunched: string;
  gitUpdateLaunched: string;
  gitOpenedDownloadPage: string;
  gitCouldntStart: string;

  settingsIdentityTitle: string;
  settingsIdentityDescription: string;
  identityNameLabel: string;
  identityEmailLabel: string;
  identityNamePlaceholder: string;
  identityEmailPlaceholder: string;
  identitySave: string;
  identitySaving: string;
  identitySaved: string;
  identityCouldntSave: string;

  settingsStartupTitle: string;
  settingsStartupDescription: string;
  startupReopenLabel: string;
  startupReopenDescription: string;

  settingsSafetyTitle: string;
  settingsSafetyDescription: string;
  safetyConfirmLabel: string;
  safetyConfirmDescription: string;

  settingsLanguageTitle: string;
  settingsLanguageDescription: string;
  languageAriaLabel: string;

  aboutGitOdrile: string;
  aboutHeading: string;
  aboutDescription: string;
  aboutBuiltWithLabel: string;
  aboutBuiltWithValue: string;
  commonClose: string;

  closeConfirmTitle: string;
  closeConfirmBodyGeneric: string;
  closeConfirmBodyNamed: (name: string) => string;
  commonCancel: string;
}

const en: Translations = {
  titlebarOpenCommandPalette: "Open command palette",
  titlebarJumpToHint: "Jump to a view or action",
  titlebarJumpTo: "Jump to…",
  windowMinimize: "Minimize window",
  windowMaximize: "Maximize or restore window",
  windowClose: "Close window",
  windowControls: "Window controls",

  brandTagline: "Git without the bite",
  sidebarCollapse: "Collapse sidebar",
  sidebarExpand: "Expand sidebar",
  navProjectAriaLabel: "Project navigation",
  navApplicationAriaLabel: "Application",
  navOverview: "Overview",
  navChanges: "Changes",
  navChangesTitle: "Changes — Coming soon",
  navHistory: "History",
  navHistoryTitle: "History — Coming soon",
  navRecovery: "Recovery",
  navRecoveryTitle: "Recovery — Coming soon",
  navSettings: "Settings",

  paletteAriaLabel: "Command palette",
  palettePlaceholder: "Jump to a view or action…",
  paletteNoMatches: "No matching commands",

  commandGoOverview: "Go to Overview",
  commandGoSettings: "Go to Settings",
  commandUseSystemTheme: "Use system theme",
  commandUseLightTheme: "Use light theme",
  commandUseDarkTheme: "Use dark theme",

  overviewWorktreeBadge: "Worktree",
  overviewCloseProject: "Close project",
  overviewEmptyTitle: "No project open",
  overviewEmptyDescription:
    "Open a Git project to review changes, save versions, publish work, and recover from mistakes.",
  overviewOpening: "Opening…",
  overviewOpenProject: "Open a project",
  overviewCloneComingSoonTitle: "Coming soon",
  overviewCloneFromGithub: "Clone from GitHub",
  overviewOpenDialogTitle: "Open a Git project",
  overviewCouldntOpenFolder: "Couldn't open that folder.",

  settingsAppearanceTitle: "Appearance",
  settingsAppearanceDescription: 'Choose how GitOdrile looks. "System" follows your OS setting automatically.',
  themeAriaLabel: "Theme",
  commonSystem: "System",
  themeLight: "Light",
  themeDark: "Dark",

  settingsGeneralTitle: "General",
  settingsGeneralDescription: "Application information and diagnostics.",
  commonVersion: "Version",
  settingsGeneralViewAbout: "View about",
  settingsGeneralGitLabel: "Git",
  settingsGeneralChecking: "Checking…",
  settingsGeneralUpdateAvailable: "Update available",
  settingsGeneralNotDetected: "Not detected.",
  settingsGeneralInstallGit: "Install Git",
  settingsGeneralUpdate: "Update",
  gitInstallerLaunched: "Installer launched — this can take a moment to appear. Reopen GitOdrile once it finishes.",
  gitUpdateLaunched: "Update launched — this can take a moment to appear. Reopen GitOdrile once it finishes.",
  gitOpenedDownloadPage: "Opened the official download page in your browser.",
  gitCouldntStart: "Couldn't start that.",

  settingsIdentityTitle: "Git identity",
  settingsIdentityDescription:
    "Used to sign the versions you save. This is a normal, global Git setting — not stored only inside GitOdrile.",
  identityNameLabel: "Name",
  identityEmailLabel: "Email",
  identityNamePlaceholder: "Ada Lovelace",
  identityEmailPlaceholder: "ada@example.com",
  identitySave: "Save",
  identitySaving: "Saving…",
  identitySaved: "Saved.",
  identityCouldntSave: "Couldn't save that.",

  settingsStartupTitle: "Startup",
  settingsStartupDescription: "Control what happens when GitOdrile launches.",
  startupReopenLabel: "Reopen last project on launch",
  startupReopenDescription: "Skip picking a folder again if you had one open last time.",

  settingsSafetyTitle: "Safety",
  settingsSafetyDescription: "Extra confirmations before you can lose your place.",
  safetyConfirmLabel: "Confirm before closing a project",
  safetyConfirmDescription: "Ask before clearing the open project, in case that was a misclick.",

  settingsLanguageTitle: "Language",
  settingsLanguageDescription: 'Choose GitOdrile\'s language. "System" follows your operating system\'s language.',
  languageAriaLabel: "Language",

  aboutGitOdrile: "About GitOdrile",
  aboutHeading: "Git without the bite.",
  aboutDescription: "GitOdrile is a friendly desktop Git client that turns version control into clear, safe steps.",
  aboutBuiltWithLabel: "Built with",
  aboutBuiltWithValue: "Tauri, React, and Rust",
  commonClose: "Close",

  closeConfirmTitle: "Close this project?",
  closeConfirmBodyGeneric: "The project stays exactly as it is on disk. You can reopen it anytime.",
  closeConfirmBodyNamed: (name) => `"${name}" stays exactly as it is on disk. You can reopen it anytime.`,
  commonCancel: "Cancel",
};

const es: Translations = {
  titlebarOpenCommandPalette: "Abrir la paleta de comandos",
  titlebarJumpToHint: "Ir a una vista o acción",
  titlebarJumpTo: "Ir a…",
  windowMinimize: "Minimizar ventana",
  windowMaximize: "Maximizar o restaurar ventana",
  windowClose: "Cerrar ventana",
  windowControls: "Controles de ventana",

  brandTagline: "Git sin mordiscos",
  sidebarCollapse: "Colapsar barra lateral",
  sidebarExpand: "Expandir barra lateral",
  navProjectAriaLabel: "Navegación del proyecto",
  navApplicationAriaLabel: "Aplicación",
  navOverview: "Resumen",
  navChanges: "Cambios",
  navChangesTitle: "Cambios — Próximamente",
  navHistory: "Historial",
  navHistoryTitle: "Historial — Próximamente",
  navRecovery: "Recuperación",
  navRecoveryTitle: "Recuperación — Próximamente",
  navSettings: "Configuración",

  paletteAriaLabel: "Paleta de comandos",
  palettePlaceholder: "Ir a una vista o acción…",
  paletteNoMatches: "No hay coincidencias",

  commandGoOverview: "Ir a Resumen",
  commandGoSettings: "Ir a Configuración",
  commandUseSystemTheme: "Usar el tema del sistema",
  commandUseLightTheme: "Usar el tema claro",
  commandUseDarkTheme: "Usar el tema oscuro",

  overviewWorktreeBadge: "Árbol de trabajo",
  overviewCloseProject: "Cerrar proyecto",
  overviewEmptyTitle: "No hay ningún proyecto abierto",
  overviewEmptyDescription:
    "Abre un proyecto de Git para revisar cambios, guardar versiones, publicar tu trabajo y recuperarte de errores.",
  overviewOpening: "Abriendo…",
  overviewOpenProject: "Abrir un proyecto",
  overviewCloneComingSoonTitle: "Próximamente",
  overviewCloneFromGithub: "Clonar desde GitHub",
  overviewOpenDialogTitle: "Abrir un proyecto de Git",
  overviewCouldntOpenFolder: "No se pudo abrir esa carpeta.",

  settingsAppearanceTitle: "Apariencia",
  settingsAppearanceDescription:
    'Elige el aspecto de GitOdrile. "Sistema" sigue automáticamente el ajuste de tu sistema operativo.',
  themeAriaLabel: "Tema",
  commonSystem: "Sistema",
  themeLight: "Claro",
  themeDark: "Oscuro",

  settingsGeneralTitle: "General",
  settingsGeneralDescription: "Información de la aplicación y diagnósticos.",
  commonVersion: "Versión",
  settingsGeneralViewAbout: "Ver información",
  settingsGeneralGitLabel: "Git",
  settingsGeneralChecking: "Comprobando…",
  settingsGeneralUpdateAvailable: "Actualización disponible",
  settingsGeneralNotDetected: "No detectado.",
  settingsGeneralInstallGit: "Instalar Git",
  settingsGeneralUpdate: "Actualizar",
  gitInstallerLaunched:
    "Instalador iniciado — puede tardar un momento en aparecer. Vuelve a abrir GitOdrile cuando termine.",
  gitUpdateLaunched:
    "Actualización iniciada — puede tardar un momento en aparecer. Vuelve a abrir GitOdrile cuando termine.",
  gitOpenedDownloadPage: "Se abrió la página oficial de descarga en tu navegador.",
  gitCouldntStart: "No se pudo iniciar eso.",

  settingsIdentityTitle: "Identidad de Git",
  settingsIdentityDescription:
    "Se usa para firmar las versiones que guardas. Es un ajuste normal y global de Git, no algo exclusivo de GitOdrile.",
  identityNameLabel: "Nombre",
  identityEmailLabel: "Correo electrónico",
  identityNamePlaceholder: "Ada Lovelace",
  identityEmailPlaceholder: "ada@example.com",
  identitySave: "Guardar",
  identitySaving: "Guardando…",
  identitySaved: "Guardado.",
  identityCouldntSave: "No se pudo guardar eso.",

  settingsStartupTitle: "Inicio",
  settingsStartupDescription: "Controla qué ocurre cuando se abre GitOdrile.",
  startupReopenLabel: "Reabrir el último proyecto al iniciar",
  startupReopenDescription: "Evita elegir una carpeta de nuevo si tenías un proyecto abierto la última vez.",

  settingsSafetyTitle: "Seguridad",
  settingsSafetyDescription: "Confirmaciones adicionales antes de perder tu lugar.",
  safetyConfirmLabel: "Confirmar antes de cerrar un proyecto",
  safetyConfirmDescription: "Pregunta antes de cerrar el proyecto abierto, por si fue un clic accidental.",

  settingsLanguageTitle: "Idioma",
  settingsLanguageDescription: 'Elige el idioma de GitOdrile. "Sistema" usa el idioma de tu sistema operativo.',
  languageAriaLabel: "Idioma",

  aboutGitOdrile: "Acerca de GitOdrile",
  aboutHeading: "Git sin mordiscos.",
  aboutDescription:
    "GitOdrile es un cliente de Git de escritorio amigable que convierte el control de versiones en pasos claros y seguros.",
  aboutBuiltWithLabel: "Hecho con",
  aboutBuiltWithValue: "Tauri, React y Rust",
  commonClose: "Cerrar",

  closeConfirmTitle: "¿Cerrar este proyecto?",
  closeConfirmBodyGeneric: "El proyecto se mantiene exactamente igual en el disco. Puedes volver a abrirlo cuando quieras.",
  closeConfirmBodyNamed: (name) => `"${name}" se mantiene exactamente igual en el disco. Puedes volver a abrirlo cuando quieras.`,
  commonCancel: "Cancelar",
};

export const translations: Record<Language, Translations> = { en, es };

function readStoredLanguagePreference(): LanguagePreference {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" || stored === "es" ? stored : "system";
}

function readNavigatorLanguage(): Language {
  return resolveLanguage(typeof navigator === "undefined" ? null : navigator.language);
}

interface LanguageContextValue {
  languagePreference: LanguagePreference;
  setLanguagePreference: (preference: LanguagePreference) => void;
  language: Language;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>(() =>
    readStoredLanguagePreference(),
  );
  const [systemLanguage, setSystemLanguage] = useState<Language>(() => readNavigatorLanguage());

  useEffect(() => {
    getOsLocale()
      .then((value) => {
        if (value) {
          setSystemLanguage(resolveLanguage(value));
        }
      })
      .catch(() => undefined);
  }, []);

  const setLanguagePreference = (preference: LanguagePreference): void => {
    setLanguagePreferenceState(preference);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, preference);
  };

  const language: Language = languagePreference === "system" ? systemLanguage : languagePreference;

  const value: LanguageContextValue = {
    languagePreference,
    setLanguagePreference,
    language,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
