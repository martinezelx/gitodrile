# GitOdrile Design Direction

## Design goal

GitOdrile should make a complex technical system feel calm, understandable, and safe. The interface must be modern and distinctive without sacrificing readability or looking like a decorative concept app.

The intended feeling is:

- friendly but professional;
- lightweight but capable;
- contemporary but durable;
- reassuring rather than intimidating.

## Visual character

The visual language may use:

- medium-to-large rounded corners;
- layered panels;
- restrained translucency and background blur;
- thin, low-contrast borders;
- soft elevation;
- generous spacing around primary actions;
- compact spacing in file lists and diffs;
- a crocodile mascot used selectively.

Avoid excessive glassmorphism. Code, diffs, file lists, conflict editors, forms, and long-form content must sit on mostly opaque surfaces.

## Layout concept

The main desktop window should broadly support:

1. **Top bar**
   - current project;
   - global search / command palette;
   - sync state;
   - settings and account entry points.

2. **Navigation rail or sidebar**
   - Overview;
   - Changes;
   - History;
   - Workspaces/branches;
   - Recovery;
   - optional advanced Git tools.

3. **Primary workspace**
   - task-focused content;
   - clear empty states;
   - contextual primary action;
   - secondary technical details on demand.

4. **Optional inspector**
   - metadata;
   - exact Git details;
   - file or commit information.

The app should work well between approximately 1024px and large desktop displays. Do not assume a maximized window.

## Design tokens

Initial tokens are intentionally provisional.

```css
:root {
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --duration-fast: 120ms;
  --duration-normal: 180ms;
}
```

Colors should be defined semantically rather than by component:

- `--surface-app`
- `--surface-panel`
- `--surface-raised`
- `--surface-code`
- `--text-primary`
- `--text-secondary`
- `--border-subtle`
- `--accent-primary`
- `--accent-primary-contrast` (text/icon color placed on top of `--accent-primary`)
- `--status-success`
- `--status-warning`
- `--status-danger`
- `--diff-added`
- `--diff-removed`
- `--overlay` (modal/backdrop scrim)
- `--surface-hover` / `--surface-active` (neutral interactive-state tints, used for any hover/pressed/selected state instead of one-off `rgba(...)` values)
- `--shadow-sm` / `--shadow-md` / `--shadow-lg` (elevation; theme-aware, see below)

Do not hard-code product colors throughout components.

### Elevation

Use shadows to signal stacking order, not to decorate: `--shadow-sm` for resting cards and controls, `--shadow-md` for content the user is meant to focus on (hero card, a lifted hover state), `--shadow-lg` for anything floating above the whole UI (dialogs, popovers). In dark mode shadows read as depth against the near-black background; in light mode they carry more of the separation work since borders alone are subtler there — both are defined per theme so neither look goes flat.

### Icons

Sidebar navigation and inline controls use small (16–18px) custom stroke icons drawn in the same restrained, geometric style as the rest of the UI (2px-ish stroke, rounded joins) — not a general-purpose icon font or a third-party icon set. An active nav item tints its icon with `--accent-primary`; the label stays `--text-primary`. Keep new icons consistent with this weight and level of detail so the sidebar doesn't mix visual styles.

### Honest affordances

A control that does nothing yet must not look fully interactive. Navigation entries for screens that don't exist yet (e.g. Changes, History, Recovery before their flows are built) are rendered `disabled` with reduced opacity and a "Coming soon" tooltip, rather than looking clickable and silently failing. Replace the disabled state with a real view as soon as the screen exists — don't leave it disabled out of habit.

### Theming: light and dark

The brand accent is a green (`--accent-primary`), but the same hex value cannot serve both themes: a light, saturated green reads well on a near-black surface but fails WCAG AA contrast on a white one. Each theme gets its own value for every color token, tuned to the same hue family so the brand stays recognizable across themes.

| Token | Dark value | Light value |
|---|---|---|
| `--surface-app` | `#0c110e` | `#f4f7f5` |
| `--surface-panel` | `rgba(24, 34, 28, 0.88)` | `rgba(255, 255, 255, 0.72)` |
| `--surface-raised` | `#18221c` | `#ffffff` |
| `--surface-code` | `#141d18` | `#eef2ef` |
| `--text-primary` | `#edf4ef` | `#101815` |
| `--text-secondary` | `#9bae9f` | `#55635a` |
| `--border-subtle` | `rgba(223, 246, 231, 0.1)` | `rgba(16, 24, 20, 0.12)` |
| `--accent-primary` | `#9de47b` | `#1f7a42` |
| `--accent-primary-contrast` | `#102010` | `#f4fff2` |
| `--status-success` | `#9de47b` | `#1f7a42` |
| `--status-warning` | `#e8b339` | `#8a5b00` |
| `--status-danger` | `#ff6b5b` | `#b3261e` |
| `--diff-added` | `#9de47b` | `#1f7a42` |
| `--diff-removed` | `#ff6b5b` | `#b3261e` |
| `--overlay` | `rgba(4, 8, 6, 0.68)` | `rgba(16, 24, 20, 0.4)` |

Every text/surface pairing above must hold at least a 4.5:1 contrast ratio (WCAG AA for body text); accent-on-surface pairings used only for large text, icons, or borders may use the AA large-text threshold (3:1) instead.

Theme resolution order (highest priority first):

1. An explicit user choice (light/dark), persisted locally and applied immediately.
2. The OS-level preference, read via `prefers-color-scheme` and followed live if the user has not overridden it.

The user must always be able to return to "match system" — the toggle is a three-state cycle (`system` → `light` → `dark` → `system`), not a binary switch, so an explicit choice never silently strands the user on a theme that has drifted from their OS setting.

Do not introduce a color anywhere in the product (status badges, diff highlighting, charts, mascot variants) without first checking whether it is expressible through an existing token; new one-off colors fragment the light/dark story.

## Brand and mascot

Working brand: **GitOdrile**.

Mascot: a stylized crocodile that feels clever, calm, and trustworthy.

Potential visual traits:

- rounded geometric silhouette;
- simple eye and one or two restrained teeth;
- confident, neutral expression;
- recognizable at 16–32px;
- adaptable to monochrome tray/taskbar contexts;
- not overly detailed or child-oriented.

The mascot may appear in:

- application icon;
- onboarding;
- empty states;
- success and recovery moments;
- documentation and marketing.

Do not place the mascot in every panel or use it to trivialize serious errors.

## Typography

Use the system UI font stack initially for native feel and low bundle cost. A branded typeface can be evaluated later.

Requirements:

- clear distinction between headings, labels, body copy, and metadata;
- monospaced text for paths, refs, hashes, commands, and diffs;
- readable line heights;
- no tiny low-contrast secondary text;
- avoid all-caps labels except very short status tags.

## Motion

Motion should communicate relationships and state changes, not decorate.

Good uses:

- panel transitions;
- file selection;
- expanding technical details;
- successful save/publish feedback;
- progress between safe-operation steps.

Rules:

- keep most transitions between 120–220ms;
- avoid large spring animations in work surfaces;
- respect `prefers-reduced-motion`;
- never delay an operation solely to show an animation.

## Transparency and native effects

Cross-platform CSS translucency may be used in the top bar, sidebar, menus, command palette, and dialogs.

Native window effects such as Windows Mica/Acrylic and macOS vibrancy are optional enhancements. The app must look complete without them because behavior varies by OS, compositor, and webview.

Linux should receive a deliberate solid-surface fallback.

## Accessibility

Minimum expectations:

- full keyboard navigation for primary workflows;
- visible focus states;
- WCAG AA text contrast where practical;
- do not communicate file state only through color;
- scalable text and layouts;
- screen-reader labels for icon-only controls;
- reduced-motion support;
- minimum comfortable pointer target sizes.

Keyboard shortcuts must use platform conventions:

- `Ctrl` on Windows/Linux;
- `Cmd` on macOS.

## Content design

The interface should explain Git in plain language while preserving technical truth.

Good:

> You have 3 saved versions that have not been published yet.

Less suitable as the default:

> Your branch is 3 commits ahead of origin/main.

Advanced details may display both.

Action labels should describe outcomes:

- Save version
- Publish changes
- Get team changes
- Set changes aside
- Restore this version
- Create separate workspace

Avoid vague labels such as “Continue” when a more precise action fits.

## Core screens for the first design pass

1. Welcome / open project.
2. Repository overview.
3. Changed files and diff viewer.
4. Save-version flow.
5. Sync/publish flow.
6. History timeline.
7. Recovery center.
8. Conflict resolution.
9. Settings and Git diagnostics.

Each screen must define loading, empty, success, warning, and error states.
