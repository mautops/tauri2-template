# Public Template Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CI/CD pipeline, structured logging + error monitoring, accessibility tooling, and surface existing hidden features (multi-window, file drop, command system) in the UI.

**Architecture:** Four independent workstreams. CI/CD is pure `.github/` config with zero code coupling. Error monitoring replaces the `log` crate with `tracing` in Rust and adds a `log_frontend_error` Tauri command wired into the existing ErrorBoundary. Accessibility adds CSS tokens and vitest-axe component tests. Existing features work adds a drop-zone overlay with toast notifications, command hints, recent commands sidebar, command palette footer, "Open in New Window" command, and quick pane pop-out button.

**Tech Stack:** GitHub Actions, tracing/tracing-appender (Rust), vitest-axe, existing Tauri/React/Zustand/sonner stack.

---

## File Structure

```
.github/
├── workflows/
│   ├── quality.yml              # PR quality gate
│   ├── release.yml              # Tag-triggered multi-platform build + draft release
│   └── housekeeping.yml         # Weekly stale bot + dependency checks
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml
│   └── feature_request.yml
├── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md

src-tauri/
├── Cargo.toml                   # Add tracing, tracing-subscriber, tracing-appender; remove log
├── src/
│   ├── logging.rs               # NEW: tracing init, panic hook, file rotation
│   ├── lib.rs                   # MODIFY: call logging::init(), replace log::* with tracing::*
│   ├── types.rs                 # MODIFY: add log_frontend_error command type
│   └── commands/
│       ├── mod.rs               # MODIFY: register new command
│       └── preferences.rs       # MODIFY: replace log::* with tracing::*

src/
├── color-schemes.css            # MODIFY: add focus-visible + reduced-motion
├── components/
│   ├── ErrorBoundary.tsx        # MODIFY: add Rust backend reporting + Reset & Reload button
│   ├── command-palette/
│   │   └── CommandPalette.tsx   # MODIFY: add footer with shortcut cheatsheet link
│   ├── layout/
│   │   ├── MainWindow.tsx       # MODIFY: add drop-zone overlay, semantic landmarks
│   │   ├── MainWindowContent.tsx # MODIFY: command hint for empty state
│   │   ├── LeftSideBar.tsx      # MODIFY: semantic <aside>
│   │   └── RightSideBar.tsx     # MODIFY: recent commands list
│   ├── preferences/panes/
│   │   └── AdvancedPane.tsx     # MODIFY: add window management section
│   ├── quick-pane/
│   │   └── QuickPaneApp.tsx     # MODIFY: add pop-out toolbar button
│   └── titlebar/
│       └── TitleBarContent.tsx  # MODIFY: semantic <nav>/<header>
├── hooks/
│   └── useFileDrop.ts           # (already exists, no changes)
├── lib/commands/
│   └── window-commands.ts       # MODIFY: add open-in-new-window command
├── store/
│   └── ui-store.ts              # MODIFY: add recentCommands tracking
└── test/
    └── a11y/
        ├── MainWindow.a11y.test.tsx   # NEW: axe-core test
        └── PreferencesDialog.a11y.test.tsx  # NEW: axe-core test

package.json                     # MODIFY: add vitest-axe devDep
```

---

## Workstream 1: CI/CD Pipeline

### Task 1: Create quality workflow

**Files:**

- Create: `.github/workflows/quality.yml`

- [ ] **Step 1: Write the quality workflow file**

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/quality.yml
name: Quality

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Install npm dependencies
        run: npm ci

      - name: Install system deps (Tauri)
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: ast-grep
        run: npm run ast:lint

      - name: Format check
        run: npm run format:check

      - name: Rust format check
        run: npm run rust:fmt:check

      - name: Rust clippy
        run: npm run rust:clippy

      - name: Run tests
        run: npm run test:all
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/quality.yml
git commit -m "ci: add PR quality gate workflow"
```

---

### Task 2: Create release workflow

**Files:**

- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write the release workflow file**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: dmg
          - os: macos-15
            target: x86_64-apple-darwin
            artifact: dmg
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact: deb
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact: msi

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install npm dependencies
        run: npm ci

      - name: Install system deps (Linux)
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev

      - name: Build
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: '${{ github.ref_name }}'
          releaseBody: 'See the assets to download this version and install.'
          releaseDraft: true
          prerelease: false
          updaterJsonPreferNsis: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add multi-platform release workflow with draft releases"
```

---

### Task 3: Create housekeeping workflow

**Files:**

- Create: `.github/workflows/housekeeping.yml`

- [ ] **Step 1: Write the housekeeping workflow file**

```yaml
# .github/workflows/housekeeping.yml
name: Housekeeping

on:
  schedule:
    - cron: '23 3 * * 1' # Monday 3:23 AM UTC
  workflow_dispatch:

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v10
        with:
          days-before-issue-stale: 60
          days-before-issue-close: 14
          days-before-pr-stale: 60
          days-before-pr-close: 14
          stale-issue-message: 'This issue has been automatically marked as stale due to inactivity. It will be closed in 14 days if no further activity occurs.'
          stale-pr-message: 'This PR has been automatically marked as stale due to inactivity. It will be closed in 14 days if no further activity occurs.'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/housekeeping.yml
git commit -m "ci: add weekly housekeeping workflow (stale bot)"
```

---

### Task 4: Create community health files

**Files:**

- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/CONTRIBUTING.md`

- [ ] **Step 1: Create directories and bug report template**

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug Report
description: Report a bug in the application
labels: ['bug']
body:
  - type: input
    id: version
    attributes:
      label: Version
      description: Which version are you using?
      placeholder: 'e.g., 0.1.0'
    validations:
      required: true
  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - macOS
        - Windows
        - Linux
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: Steps to Reproduce
      description: Clear steps to trigger the bug
      placeholder: '1. Go to... 2. Click on... 3. See error...'
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened?
    validations:
      required: true
```

- [ ] **Step 2: Write feature request template**

```yaml
# .github/ISSUE_TEMPLATE/feature_request.yml
name: Feature Request
description: Suggest a new feature for the application
labels: ['enhancement']
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem would this feature solve?
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like to see
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: What other solutions have you considered?
```

- [ ] **Step 3: Write PR template**

```markdown
# .github/PULL_REQUEST_TEMPLATE.md

## Summary

<!-- Brief description of the changes -->

## Checklist

- [ ] Ran `npm run check:all` and all checks pass
- [ ] Added or updated tests as needed
- [ ] Updated relevant documentation in `docs/developer/`
- [ ] Tested manually on my target platform
```

- [ ] **Step 4: Write CONTRIBUTING.md**

````markdown
# .github/CONTRIBUTING.md

# Contributing

## Getting Started

1. Clone the repo and run `npm install`
2. Run `npm run tauri:dev` to start the development server
3. Make your changes on a feature branch

## Development Workflow

- Run `npm run check:all` before committing — this runs typecheck, lint, ast-grep, format check, clippy, and all tests
- Use `npm run fix:all` to auto-fix formatting and linting issues
- Follow the patterns documented in `docs/developer/`

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `refactor:` for code restructuring
- `test:` for adding tests
- `ci:` for CI/CD changes

## Code Signing

For macOS distribution, you need an Apple Developer account and a signing certificate. Set the following in `src-tauri/tauri.conf.json`:

```json
"macOS": {
  "signingIdentity": "Apple Distribution: Your Name (TEAM_ID)",
  "providerShortName": "TEAM_ID"
}
```
````

For Windows, set the signing certificate path in the `bundle` section.

````

- [ ] **Step 5: Commit**

```bash
git add .github/ISSUE_TEMPLATE/ .github/PULL_REQUEST_TEMPLATE.md .github/CONTRIBUTING.md
git commit -m "docs: add community health files (issue templates, PR template, contributing guide)"
````

---

## Workstream 2: Error Monitoring & Structured Logging

### Task 5: Add tracing dependencies to Cargo.toml

**Files:**

- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add tracing crates, remove log**

Read `src-tauri/Cargo.toml`. Add these dependencies:

```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-appender = "0.2"
```

Remove the `log = "0.4"` entry from `[dependencies]`.

- [ ] **Step 2: Verify Cargo compiles**

```bash
cd src-tauri && cargo check
```

Expected: may fail — that's expected, we haven't migrated `log::*` calls yet. Move to next task.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "deps: replace log crate with tracing ecosystem"
```

---

### Task 6: Create Rust logging module

**Files:**

- Create: `src-tauri/src/logging.rs`

- [ ] **Step 1: Write the logging module**

```rust
//! Structured logging via `tracing` with file rotation, panic hooks, and
//! JSON output in release builds.

use std::path::PathBuf;
use tracing_appender::rolling::Rotation;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Returns the app's log directory, creating it if needed.
fn log_dir(app_data: &PathBuf) -> PathBuf {
    let dir = app_data.join("logs");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Returns the app's crash directory, creating it if needed.
fn crash_dir(app_data: &PathBuf) -> PathBuf {
    let dir = app_data.join("crashes");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Initialize the tracing subscriber.
///
/// - Dev: pretty-printed to stdout at DEBUG level + Webview target from plugin-log
/// - Release: JSON structured logs to rotating files, WARN+ level for dependencies
pub fn init(app_data_dir: PathBuf) {
    let log_path = log_dir(&app_data_dir);
    let file_appender = tracing_appender::rolling::Builder::new()
        .rotation(Rotation::DAILY)
        .filename_prefix("app")
        .filename_suffix("log")
        .max_log_files(7)
        .build(log_path)
        .expect("failed to create file appender");

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| {
            if cfg!(debug_assertions) {
                EnvFilter::new("debug")
            } else {
                EnvFilter::new("info")
            }
        });

    if cfg!(debug_assertions) {
        // Dev: pretty-print to stdout and also write to file
        let stdout_layer = fmt::layer()
            .pretty()
            .with_target(true)
            .with_filter(env_filter);
        let file_layer = fmt::layer()
            .json()
            .with_writer(file_appender)
            .with_filter(EnvFilter::new("info"));
        tracing_subscriber::registry()
            .with(stdout_layer)
            .with(file_layer)
            .init();
    } else {
        // Release: JSON to file only
        let file_layer = fmt::layer()
            .json()
            .with_writer(file_appender)
            .with_filter(env_filter);
        tracing_subscriber::registry()
            .with(file_layer)
            .init();
    }
}

/// Install a custom panic hook that writes crash data before exit.
pub fn set_panic_hook(app_data_dir: PathBuf) {
    let crash_path = {
        let dir = crash_dir(&app_data_dir);
        dir.join(format!("crash-{}.log", chrono::Utc::now().format("%Y%m%dT%H%M%S")))
    };

    std::panic::set_hook(Box::new(move |info| {
        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .copied()
            .unwrap_or_else(|| {
                info.payload()
                    .downcast_ref::<String>()
                    .map(|s| s.as_str())
                    .unwrap_or("(non-string panic payload)")
            });

        let location = info
            .location()
            .map(|loc| format!("{loc}"))
            .unwrap_or_else(|| "unknown location".to_string());

        // Write crash file
        let crash_entry = serde_json::json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "payload": payload,
            "location": location,
        });

        if let Ok(json) = serde_json::to_string_pretty(&crash_entry) {
            let _ = std::fs::write(&crash_path, json);
        }

        // Also emit via tracing so it ends up in the regular log
        tracing::error!(panic.payload = payload, panic.location = %location, "Application panicked");
    }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/src/logging.rs
git commit -m "feat: add tracing-based logging module with crash hooks"
```

---

### Task 7: Integrate tracing into lib.rs

**Files:**

- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add module declaration and replace log calls**

Add to the top `mod` block:

```rust
mod logging;
```

In `setup()`, at the very beginning (before any `log::info!` calls), add:

```rust
// Initialize tracing before anything else
{
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    logging::init(app_data_dir.clone());
    logging::set_panic_hook(app_data_dir);
}
```

Replace all `log::info!`, `log::debug!`, `log::warn!`, `log::error!` with `tracing::info!`, `tracing::debug!`, `tracing::warn!`, `tracing::error!` respectively. The macro syntax is identical.

- [ ] **Step 2: Replace log calls in commands/preferences.rs**

Replace `log::*` with `tracing::*` in:

- `src-tauri/src/commands/preferences.rs` (lines using `log::debug!`, `log::info!`, `log::warn!`, `log::error!`)

- [ ] **Step 3: Verify compilation**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: compiles successfully with zero `log::` references remaining.

- [ ] **Step 4: Run Rust tests to verify nothing broke**

```bash
npm run rust:test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/commands/preferences.rs src-tauri/src/commands/mod.rs
git commit -m "refactor: migrate from log crate to tracing throughout"
```

---

### Task 8: Add frontend error reporting command

**Files:**

- Modify: `src-tauri/src/commands/preferences.rs` (or a new `diagnostics.rs`)
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add the command in preferences.rs**

Add to the end of `src-tauri/src/commands/preferences.rs`:

```rust
/// Logs a frontend error to the Rust tracing system.
/// Called by the React ErrorBoundary when a render crash occurs.
#[tauri::command]
#[specta::specta]
pub fn log_frontend_error(message: String, stack: Option<String>) {
    tracing::error!(
        frontend.error = message,
        frontend.stack = stack.unwrap_or_default(),
        "Frontend render error"
    );
}
```

- [ ] **Step 2: Register the command**

The command is auto-registered via `bindings.rs` build macro (tauri-specta collects all `#[specta::specta]` functions). No manual registration needed. Run bindings generation:

```bash
npm run rust:bindings
```

This updates `src/lib/bindings.ts` to include `logFrontendError`.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/preferences.rs src/lib/bindings.ts src-tauri/src/bindings.rs
git commit -m "feat: add log_frontend_error command for crash reporting"
```

---

### Task 9: Enhance ErrorBoundary with Rust reporting and Reset & Reload

**Files:**

- Modify: `src/components/ErrorBoundary.tsx`

- [ ] **Step 1: Update ErrorBoundary to report errors to Rust and add Reset & Reload**

Replace the `handleReload` and `handleReset` methods with enhanced versions, and add Rust reporting in `componentDidCatch`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { saveCrashState } from '@/lib/recovery'
import { logger } from '@/lib/logger'
import { commands } from '@/lib/tauri-bindings'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

/**
 * Error boundary that saves crash state, reports to Rust logging,
 * and provides recovery options: Reload, Reset & Reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Application crashed', {
      error: error.message,
      stack: error.stack,
    })

    this.setState({ errorInfo })

    // Report to Rust logging for persistent crash records
    commands.logFrontendError(error.message, error.stack ?? null).catch(() => {
      // Best-effort — don't throw from error boundary
    })

    // Save crash state for recovery (existing behavior)
    this.saveCrashData(error, errorInfo)
  }

  private async saveCrashData(error: Error, errorInfo: ErrorInfo) {
    try {
      const appState = {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }

      await saveCrashState(appState, {
        error: error.message,
        stack: error.stack || 'No stack trace available',
        componentStack: errorInfo.componentStack || undefined,
      })
    } catch (saveError) {
      logger.error('Failed to save crash data', { saveError })
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleResetAndReload = () => {
    // Clear preferences and recovery data from localStorage, then reload
    try {
      localStorage.clear()
    } catch {
      // localStorage may be unavailable in some crash scenarios
    }
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-6">
                The application encountered an unexpected error. Your data has
                been saved automatically.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reload Application
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
              >
                Reset &amp; Reload
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">
                  <div className="text-destructive font-semibold mb-1">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="whitespace-pre-wrap text-muted-foreground overflow-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ErrorBoundary.tsx
git commit -m "feat: add Rust crash reporting and Reset & Reload to ErrorBoundary"
```

---

## Workstream 3: Accessibility

### Task 10: Add CSS a11y tokens to color-schemes.css

**Files:**

- Modify: `src/color-schemes.css`

- [ ] **Step 1: Add focus-visible and reduced-motion rules**

Prepend to `src/color-schemes.css` (before the first color scheme block):

```css
/*
 * Accessibility base tokens.
 * These apply regardless of the active color scheme.
 */

/* Focus ring — only visible on keyboard navigation, not mouse clicks */
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Respect the user's motion preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/color-schemes.css
git commit -m "feat: add focus-visible and reduced-motion a11y tokens"
```

---

### Task 11: Update layout components with semantic HTML

**Files:**

- Modify: `src/components/layout/LeftSideBar.tsx`
- Modify: `src/components/layout/RightSideBar.tsx`
- Modify: `src/components/titlebar/TitleBarContent.tsx`

- [ ] **Step 1: Change LeftSideBar div to aside**

In `src/components/layout/LeftSideBar.tsx`, change `<div>` to `<aside>` and add the `aria-label`:

Old:

```tsx
<div className={cn('flex h-full flex-col border-r glass', className)}>
  {children}
</div>
```

New:

```tsx
<aside
  className={cn('flex h-full flex-col border-r glass', className)}
  aria-label="Left sidebar"
>
  {children}
</aside>
```

- [ ] **Step 2: Change RightSideBar div to aside**

In `src/components/layout/RightSideBar.tsx`, make the same change:

```tsx
<aside
  className={cn('flex h-full flex-col border-l glass', className)}
  aria-label="Right sidebar"
>
  {children}
</aside>
```

- [ ] **Step 3: Add role attributes to TitleBarContent**

In `src/components/titlebar/TitleBarContent.tsx`, wrap the outer fragment content with semantic landmarks:

The `TitleBarContent` component returns a fragment — add `role="toolbar"` and `aria-label` by wrapping in a `<nav>`:

```tsx
export function TitleBarContent({ title = 'Tauri App' }: TitleBarTitleProps) {
  return (
    <nav role="toolbar" aria-label="Title bar" className="contents">
      <TitleBarLeftActions />
      <TitleBarTitle title={title} />
      <TitleBarRightActions />
    </nav>
  )
}
```

Wait — the parent `TitleBar` composes these. Let me check how TitleBar uses them to decide the right place.

Since `TitleBarContent` is just a convenience composition, and `TitleBarLeftActions`, `TitleBarRightActions`, and `TitleBarTitle` are used individually too, the best approach is to add `role` and `aria-label` on the buttons in `TitleBarLeftActions` and `TitleBarRightActions` (they already have `title` attributes), and leave the structure alone. The existing `title` attributes on the sidebar toggle buttons already serve as accessible labels.

No structural change needed for `TitleBarContent.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/LeftSideBar.tsx src/components/layout/RightSideBar.tsx
git commit -m "feat: use semantic <aside> landmarks for sidebars"
```

---

### Task 12: Add vitest-axe and create a11y component tests

**Files:**

- Modify: `package.json`
- Create: `src/test/a11y/MainWindow.a11y.test.tsx`
- Create: `src/test/a11y/PreferencesDialog.a11y.test.tsx`

- [ ] **Step 1: Install vitest-axe**

```bash
npm install --save-dev vitest-axe
```

- [ ] **Step 2: Write MainWindow a11y test**

```bash
mkdir -p src/test/a11y
```

```tsx
// src/test/a11y/MainWindow.a11y.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { MainWindow } from '@/components/layout/MainWindow'

describe('MainWindow accessibility', () => {
  it('has no a11y violations', async () => {
    const { container } = render(<MainWindow />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 3: Write PreferencesDialog a11y test**

```tsx
// src/test/a11y/PreferencesDialog.a11y.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'

describe('PreferencesDialog accessibility', () => {
  it('has no a11y violations when open', async () => {
    const { container } = render(<PreferencesDialog />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

- [ ] **Step 4: Run the new a11y tests to verify they run (may fail on violations — that's expected, we fix next)**

```bash
npx vitest run src/test/a11y/
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/test/a11y/
git commit -m "test: add vitest-axe a11y component tests"
```

---

### Task 13: Add live region for route/page announcements

**Files:**

- Modify: `src/components/layout/MainWindow.tsx`

- [ ] **Step 1: Add a screen-reader-only live region**

In `MainWindow.tsx`, add a visually-hidden live region inside the main container. Insert right after the `<TitleBar />` line:

```tsx
{
  /* Screen reader announcements for route/page changes */
}
;<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
  id="page-announcer"
/>
```

The Tailwind `sr-only` class should already be available. If not, add this to `src/App.css`:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MainWindow.tsx
git commit -m "feat: add aria-live region for screen reader announcements"
```

---

## Workstream 4: Surfacing Existing Features

### Task 14: Add file drop zone overlay to MainWindow

**Files:**

- Modify: `src/components/layout/MainWindow.tsx`

- [ ] **Step 1: Add drop zone state and overlay**

Add import for `useFileDrop` and `useState`:

```tsx
import { useState } from 'react'
import { useFileDrop } from '@/hooks/useFileDrop'
import { Upload } from 'lucide-react'
```

Add state and handler inside the `MainWindow` component:

```tsx
const [isDragging, setIsDragging] = useState(false)

useFileDrop({
  onDrop: paths => {
    setIsDragging(false)
    // Example: log dropped files — users customize this handler
    console.log('Files dropped:', paths)
  },
  onHover: () => setIsDragging(true),
  onLeave: () => setIsDragging(false),
})
```

Add the drop zone overlay inside the outermost `<div>` (after the `Toaster` component, still inside the glass container):

```tsx
{
  /* File drop zone overlay */
}
{
  isDragging && (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-[var(--app-corner-radius)] pointer-events-none"
      aria-label="Drop files to upload"
    >
      <div className="flex flex-col items-center gap-3 text-primary">
        <Upload className="h-10 w-10" />
        <span className="text-lg font-medium">Drop files here</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MainWindow.tsx
git commit -m "feat: add file drop zone overlay with visual feedback"
```

---

### Task 15: Add command hint to empty MainWindowContent

**Files:**

- Modify: `src/components/layout/MainWindowContent.tsx`

- [ ] **Step 1: Add command palette hint and keyboard shortcut visualization**

In `MainWindowContent.tsx`, add imports:

```tsx
import { Keyboard } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
```

Replace the empty state section to include command hints:

```tsx
export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  const lastQuickPaneEntry = useUIStore(state => state.lastQuickPaneEntry)

  return (
    <main className={cn('flex h-full flex-col bg-background/60', className)}>
      {children || (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {lastQuickPaneEntry ? (
            <h1 className="text-4xl font-bold text-foreground">
              Last entry: {lastQuickPaneEntry}
            </h1>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <h1 className="text-4xl font-bold text-foreground">
                Welcome to Tauri App
              </h1>
              <p className="text-muted-foreground max-w-md">
                Press{' '}
                <kbd className="px-2 py-0.5 text-xs bg-muted border rounded font-mono">
                  Cmd+K
                </kbd>{' '}
                to search commands, or{' '}
                <kbd className="px-2 py-0.5 text-xs bg-muted border rounded font-mono">
                  Cmd+Shift+P
                </kbd>{' '}
                to open the quick pane.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MainWindowContent.tsx
git commit -m "feat: add command hints and semantic <main> landmark"
```

---

### Task 16: Run full quality gate and fix any issues

- [ ] **Step 1: Run check:all**

```bash
npm run check:all
```

Expected: all checks pass. If any fail (e.g., new files not formatted, imports unused), fix them:

```bash
npm run fix:all
npm run rust:bindings
```

- [ ] **Step 2: Manual review of the generated bindings**

Verify `src/lib/bindings.ts` includes the new `logFrontendError` function.

- [ ] **Step 3: Commit any fixup changes**

```bash
git add -A
git commit -m "chore: quality gate fixes after template enhancements"
```

---

### Task 17: Add toast notification for file drops

**Files:**

- Modify: `src/components/layout/MainWindow.tsx`

- [ ] **Step 1: Add toast import and drop notification**

Add `toast` import from `sonner` near the existing imports in `MainWindow.tsx`:

```tsx
import { toast } from 'sonner'
```

Update the `onDrop` callback in the `useFileDrop` call to show a toast:

```tsx
useFileDrop({
  onDrop: paths => {
    setIsDragging(false)
    toast.success(
      `Dropped ${paths.length} file${paths.length !== 1 ? 's' : ''}`,
      {
        description: paths.map(p => p.split('/').pop() || p).join(', '),
      }
    )
  },
  onHover: () => setIsDragging(true),
  onLeave: () => setIsDragging(false),
})
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MainWindow.tsx
git commit -m "feat: add toast notification for file drop events"
```

---

### Task 18: Add recent commands tracking and RightSideBar display

**Files:**

- Modify: `src/store/ui-store.ts`
- Modify: `src/components/layout/RightSideBar.tsx`

- [ ] **Step 1: Add recentCommands to ui-store**

In `src/store/ui-store.ts`, add to the `UIState` interface:

```tsx
recentCommands: { id: string; label: string; timestamp: number }[]
addRecentCommand: (id: string, label: string) => void
```

Add the initial value and setter in `create()`:

```tsx
recentCommands: [],

addRecentCommand: (id, label) =>
  set(
    state => ({
      recentCommands: [
        { id, label, timestamp: Date.now() },
        ...state.recentCommands.filter(c => c.id !== id),
      ].slice(0, 5),
    }),
    undefined,
    'addRecentCommand'
  ),
```

- [ ] **Step 2: Wire addRecentCommand in the command system**

In `src/lib/commands/registry.ts`, the `executeCommand` function needs to call `addRecentCommand` on the store after successful execution. Add a store hook import and call:

```tsx
import { useUIStore } from '@/store/ui-store'

// In executeCommand, after await command.execute(context):
// Record in recent commands
const cmd = commandRegistry.get(commandId)
if (cmd) {
  useUIStore.getState().addRecentCommand(commandId, cmd.labelKey)
}
```

- [ ] **Step 3: Show recent commands in RightSideBar**

Replace the empty state of `RightSideBar.tsx`:

```tsx
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'

export function RightSideBar({ children, className }: RightSideBarProps) {
  const { t } = useTranslation()
  const recentCommands = useUIStore(state => state.recentCommands)

  return (
    <aside
      className={cn('flex h-full flex-col border-l glass', className)}
      aria-label="Right sidebar"
    >
      {children || (
        <div className="flex flex-col p-4 gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{t('sidebar.recentCommands', 'Recent Commands')}</span>
          </div>
          {recentCommands.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('sidebar.noRecentCommands', 'No commands executed yet')}
            </p>
          ) : (
            <ul className="space-y-1" role="list" aria-label="Recent commands">
              {recentCommands.map(cmd => (
                <li
                  key={cmd.id}
                  className="text-xs text-muted-foreground truncate"
                >
                  {t(cmd.label)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/store/ui-store.ts src/lib/commands/registry.ts src/components/layout/RightSideBar.tsx
git commit -m "feat: add recent commands tracking and sidebar display"
```

---

### Task 19: Add command palette footer with shortcut cheatsheet link

**Files:**

- Modify: `src/components/command-palette/CommandPalette.tsx`

- [ ] **Step 1: Add footer to CommandPalette**

Add import:

```tsx
import { Keyboard } from 'lucide-react'
```

Add a footer section inside `<CommandDialog>` after `</CommandList>`:

```tsx
<div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
  <span>
    <kbd className="px-1.5 py-0.5 bg-muted border rounded font-mono text-[10px]">
      &uarr;&darr;
    </kbd>{' '}
    navigate{' '}
    <kbd className="px-1.5 py-0.5 bg-muted border rounded font-mono text-[10px]">
      &crarr;
    </kbd>{' '}
    select{' '}
    <kbd className="px-1.5 py-0.5 bg-muted border rounded font-mono text-[10px]">
      esc
    </kbd>{' '}
    close
  </span>
  <button
    type="button"
    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
    onClick={() => {
      setCommandPaletteOpen(false)
      setSearch('')
      // Open preferences to the shortcuts pane
      const { setPreferencesOpen } = useUIStore.getState()
      setPreferencesOpen(true)
    }}
    aria-label="Open keyboard shortcuts settings"
  >
    <Keyboard className="h-3 w-3" />
    <span>{t('commandPalette.shortcutCheatsheet', 'Shortcuts')}</span>
  </button>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/command-palette/CommandPalette.tsx
git commit -m "feat: add command palette footer with shortcut cheatsheet link"
```

---

### Task 20: Add "Open in New Window" command

**Files:**

- Modify: `src/lib/commands/window-commands.ts`
- Modify: `locales/en.json`

- [ ] **Step 1: Add the command to window-commands.ts**

Add import:

```tsx
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
```

Append to the `windowCommands` array:

```tsx
{
  id: 'window-open-new',
  labelKey: 'commands.windowOpenNew.label',
  descriptionKey: 'commands.windowOpenNew.description',
  group: 'window',

  execute: async context => {
    try {
      const webview = new WebviewWindow('extra-' + Date.now(), {
        url: '/',
        title: 'Tauri App',
        width: 1000,
        height: 700,
      })
      await webview.once('tauri://created', () => {})
      context.showToast(
        i18n.t('toast.success.windowOpened', 'New window opened'),
        'success'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      context.showToast(
        i18n.t('toast.error.windowOpenFailed', { message }),
        'error'
      )
    }
  },
},
```

- [ ] **Step 2: Add i18n keys to en.json**

In `locales/en.json`, add:

```json
"commands": {
  "windowOpenNew": {
    "label": "Open in New Window",
    "description": "Open a new application window"
  }
}
```

Add to the `toast` section:

```json
"toast": {
  "success": {
    "windowOpened": "New window opened"
  },
  "error": {
    "windowOpenFailed": "Failed to open new window: {{message}}"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/commands/window-commands.ts locales/en.json
git commit -m "feat: add 'Open in New Window' command"
```

---

### Task 21: Add multi-window pop-out button to QuickPane toolbar

**Files:**

- Modify: `src/components/quick-pane/QuickPaneApp.tsx`

- [ ] **Step 1: Add pop-out button to QuickPaneApp**

Add imports:

```tsx
import { ExternalLink } from 'lucide-react'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
```

Add a toolbar button in the form, between the `<form>` opening and the `<input>`:

```tsx
<form
  onSubmit={handleSubmit}
  className="flex h-screen w-screen items-center rounded-[var(--app-corner-radius)] border border-white/10 bg-background/50 backdrop-blur-xl px-5 shadow-lg gap-2"
>
  <input
    ref={inputRef}
    type="text"
    value={text}
    onChange={e => setText(e.target.value)}
    placeholder="Enter text..."
    className="w-full bg-transparent text-lg text-foreground placeholder:text-muted-foreground outline-none"
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck={false}
  />
  <button
    type="button"
    className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
    onClick={async () => {
      const webview = new WebviewWindow('quick-pane-popout-' + Date.now(), {
        url: '/quick-pane.html',
        title: 'Quick Pane',
        width: 500,
        height: 60,
        decorations: false,
        alwaysOnTop: true,
      })
    }}
    aria-label="Pop out to separate window"
    title="Pop out to window"
  >
    <ExternalLink className="h-4 w-4" />
  </button>
</form>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/quick-pane/QuickPaneApp.tsx
git commit -m "feat: add pop-out button to quick pane toolbar"
```

---

## Implementation Order

Run tasks sequentially in this order:

```
Task 1  → Task 2  → Task 3  → Task 4    (CI/CD — no code coupling)
Task 5  → Task 6  → Task 7  → Task 8  → Task 9  (Error monitoring — deps → module → integration → frontend)
Task 10 → Task 11 → Task 12 → Task 13  (Accessibility — CSS → HTML → tests → live region)
Task 14 → Task 15                       (Drop zone + command hints)
Task 17 → Task 18 → Task 19             (File drop toast + recent commands + Command palette footer)
Task 20 → Task 21                       (Multi-window commands + Quick pane pop-out)
Task 16                                 (Final quality gate — MUST run last)
```

Workstreams 1, 3, and 4 are independent of workstream 2. After Task 5-9 (tracing migration) completes, all other workstreams can proceed in parallel.
