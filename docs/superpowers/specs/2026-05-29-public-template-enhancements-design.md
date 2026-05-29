# Public Template Enhancements — Design Spec

Date: 2026-05-29

## Overview

Three new capability areas for the public template, plus surfacing existing but hidden features in the UI.

1. **CI/CD pipeline** — GitHub Actions: PR quality gate + multi-platform release + housekeeping
2. **Error monitoring & structured logging** — tracing crate, ErrorBoundary, crash recovery
3. **Accessibility (a11y)** — axe-core CI checks, design system, component patterns
4. **Existing features UX** — Make multi-window, file drop, and command system discoverable

---

## 1. CI/CD Pipeline

### 1.1 Workflows

**quality.yml** — Triggers on PR to `main`. Ubuntu single runner. Runs:

```
typecheck → lint → ast:lint → format:check → rust:fmt:check → rust:clippy → test:all → a11y tests
```

Fails fast on first violation. Expected runtime: 3-5 min.

**release.yml** — Triggers on tag push (`v*`). macOS/Windows/Linux parallel matrix:

```
checkout → setup node/rust → install → build (tauri build) → upload artifacts + updater manifest
```

On completion: create GitHub draft release with all binaries, updater JSON, and auto-generated changelog (from conventional commits since last tag).

**housekeeping.yml** — Weekly cron. Two jobs:

- Stale bot: label issues/PRs inactive > 60 days, close after 14 more days
- Dependabot-style bump: open PR for npm patch updates, cargo patch updates

### 1.2 Community Files

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml        # Form: version, OS, repro steps, expected, actual
│   └── feature_request.yml   # Form: problem statement, proposed solution
├── PULL_REQUEST_TEMPLATE.md  # Checklist: tests passed, docs updated, check:all ran
├── CONTRIBUTING.md           # Setup guide, branch naming, commit convention
```

### 1.3 What's Not Included

- Code signing (requires per-project certificates — documented in CONTRIBUTING.md)
- Release-please or auto-version-bump (add when the project matures)
- ARM64 builds (add when user demand exists)

---

## 2. Error Monitoring & Structured Logging

### 2.1 Rust: tracing migration

Replace `log` crate with `tracing` + `tracing-appender`:

```rust
// src-tauri/src/logging.rs

use tracing_appender::rolling::Rotation;
use tracing_subscriber::{fmt, EnvFilter};

pub fn init() {
    let file_appender = tracing_appender::rolling::daily(
        app_log_dir(), "app.log",
    ).with_max_files(7); // 7 days retention

    let panic_log = app_crash_dir().join(format!("crash-{}.log", chrono::Utc::now()));

    // Release: JSON structured logs to file, only WARN+ for dependencies
    // Dev: pretty-print to stdout at DEBUG level
    let env_layer = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    // ... subscriber setup
}

// Panic hook writes crash file before exit
pub fn set_panic_hook() { ... }
```

Key decisions:

- **No external service dependency** (no Sentry) — everything is local
- JSON format in release for machine parsing, pretty-print in dev
- Panic hook writes crash file with full backtrace + app state snapshot

### 2.2 React: ErrorBoundary

```tsx
// src/components/ErrorBoundary.tsx
// Wraps MainWindow. On crash:
// 1. Logs error stack to Rust via command
// 2. Shows recovery dialog: "Something went wrong"
//    - [Reload Window] — full page reload
//    - [Reset & Reload] — clears preferences/recovery data, then reload
// 3. Reports crash file path for user to share in bug reports
```

Error reporting command:

```rust
#[tauri::command]
#[specta::specta]
pub fn log_frontend_error(message: String, stack: Option<String>) {
    tracing::error!(frontend.error = message, frontend.stack = stack.unwrap_or_default());
}
```

### 2.3 Existing Plugin

`tauri-plugin-log` stays — it already pipes Rust logs to browser console in dev mode. The tracing migration is additive.

### 2.4 What's Not Included

- Built-in log viewer UI (user's choice)
- Remote log aggregation / Sentry integration
- Anonymized telemetry

---

## 3. Accessibility (a11y)

### 3.1 Design System Tokens

Add to `src/color-schemes.css`:

```css
/* Focus ring — only visible on keyboard navigation */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

/* Reduced motion — override animations */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Contrast: verify all `--foreground`/`--background` pairs in each color scheme meet 4.5:1.

### 3.2 Component Patterns

**Semantic HTML** — existing layout components get proper landmarks:

- Sidebars: `<aside>` with `aria-label`
- Main content: `<main>`
- Title bar: `<header>` / `<nav>`

**Live regions** — route changes announce page title:

```tsx
// In MainWindow or router
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {pageTitle}
</div>
```

**Focus trap** — dialogs (PreferencesDialog, QuickPane) trap focus within when open. Radix dialogs already handle this; verify and test.

**Keyboard shortcuts visible** — ShortcutsPane (already in progress) lists all registered shortcuts with their keys.

### 3.3 CI Integration

- Add `vitest-axe` (or `jest-axe`) as dev dependency
- Component-level a11y assertions for: MainWindow, SideBar, PreferencesDialog, CommandPalette, QuickPaneApp
- Runs in `test:all`, zero violations = pass

```typescript
// Example test pattern
import { axe } from 'vitest-axe'
import { render } from '@testing-library/react'

it('MainWindow has no a11y violations', async () => {
  const { container } = render(<MainWindow />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### 3.4 What's Not Included

- E2E a11y scanning (separate tooling)
- Full WCAG 2.1 AA audit (requires manual review)
- Screen reader vendor-specific workarounds

---

## 4. Surfacing Existing Hidden Capabilities

Three features already implemented but not discoverable in the current UI.

### 4.1 Multi-Window

**Current state**: Quick Pane system works (Cmd+Shift+P opens floating window). Architecture supports multiple windows.

**Add**:

- Command palette entry: "Open in New Window" action for applicable items
- Preferences → Advanced: Window management section showing open windows
- Quick Pane toolbar: subtle "pop out to window" button on hover

### 4.2 File Drop

**Current state**: `useFileDrop.ts` hook written. Not wired into any visible UI.

**Add**:

- MainWindowContent: drop zone overlay when files are dragged over the window
- Visual feedback: dashed border + "Drop files here" hint using existing i18n pattern
- Drop result: toast notification (sonner already installed) showing success/failure

```tsx
// Drop zone overlay pattern
{
  isDragging && (
    <div className="drop-zone-overlay">
      <UploadIcon />
      <p>{t('dropZone.releaseToDrop')}</p>
    </div>
  )
}
```

### 4.3 Command System

**Current state**: Full command system with registration, context, keyboard shortcuts. Cmd+K opens command palette.

**Add**:

- Empty state hint in main content: "Press Cmd+K to search commands" (first-time user guidance)
- Command palette footer: shortcut cheatsheet link → opens ShortcutsPane in preferences
- Right sidebar: "Recent Commands" list showing last 5 executed commands

### 4.4 What's Not Included

- Drag-and-drop between windows (complex, niche)
- Command history persistence across sessions (add later if needed)
- File open dialog (separate feature)

---

## Implementation Order

1. **CI/CD** — unblocks everything else, no code coupling
2. **Error monitoring** — tracing migration + ErrorBoundary
3. **Accessibility** — design system tokens + semantic HTML + axe tests
4. **Existing features surfacing** — multi-window UI, drop zone, command hints

## Dependencies

- CI/CD: none. Pure .github/ files.
- Error monitoring: add `tracing`, `tracing-subscriber`, `tracing-appender` to Cargo.toml. Replace `log` usage in existing code.
- Accessibility: add `vitest-axe` (or `jest-axe`) to devDependencies.
- Surfacing features: uses existing `useFileDrop`, command system, sonner — no new deps.
