//! Tauri application library entry point.
//!
//! This module serves as the main entry point for the Tauri application.
//! Command implementations are organized in the `commands` module,
//! and shared types are in the `types` module.

mod bindings;
mod commands;
mod logging;
mod types;
mod utils;

use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Manager, RunEvent, WindowEvent};

// Re-export only what's needed externally
pub use types::DEFAULT_QUICK_PANE_SHORTCUT;

/// Application entry point. Sets up all plugins and initializes the app.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = bindings::generate_bindings();

    // Export TypeScript bindings in debug builds
    #[cfg(debug_assertions)]
    bindings::export_ts_bindings();

    // Build with common plugins
    let mut app_builder = tauri::Builder::default();

    // Single instance plugin must be registered FIRST
    // When user tries to open a second instance, focus the existing window instead
    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }));
    }

    // Window state plugin - saves/restores window position and size
    // Note: quick-pane is denylisted because it's an NSPanel and calling is_maximized() on it crashes
    // See: https://github.com/tauri-apps/plugins-workspace/issues/1546
    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(tauri_plugin_window_state::StateFlags::all())
                .with_denylist(&["quick-pane"])
                .build(),
        );
    }

    // Updater plugin for in-app updates
    #[cfg(desktop)]
    {
        app_builder = app_builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    app_builder = app_builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init());

    // macOS: Add NSPanel plugin for native panel behavior
    #[cfg(target_os = "macos")]
    {
        app_builder = app_builder.plugin(tauri_nspanel::init());
    }

    app_builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_cli::init())
        .setup(|app| {
            // Initialize tracing before anything else
            {
                let app_data_dir = app
                    .path()
                    .app_data_dir()
                    .expect("failed to resolve app data dir");
                logging::init(app_data_dir.clone());
                logging::set_panic_hook(app_data_dir);
            }

            tracing::info!("Application starting up");
            tracing::debug!(
                "App handle initialized for package: {}",
                app.package_info().name
            );

            // Set up global shortcut plugin (without any shortcuts - we register them separately)
            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::Builder;

                app.handle().plugin(Builder::new().build())?;
            }

            // Load saved preferences and register global shortcuts
            #[cfg(desktop)]
            {
                // Quick pane shortcut
                let saved_shortcut = commands::preferences::load_quick_pane_shortcut(app.handle());
                let shortcut_to_register = saved_shortcut
                    .as_deref()
                    .unwrap_or(DEFAULT_QUICK_PANE_SHORTCUT);
                tracing::info!("Registering quick pane shortcut: {shortcut_to_register}");
                commands::quick_pane::register_quick_pane_shortcut(
                    app.handle(),
                    shortcut_to_register,
                )?;

                // Left sidebar shortcut
                let saved_left = commands::preferences::load_left_sidebar_shortcut(app.handle());
                let left_shortcut = saved_left
                    .as_deref()
                    .unwrap_or(types::DEFAULT_LEFT_SIDEBAR_SHORTCUT);
                tracing::info!("Registering left sidebar shortcut: {left_shortcut}");
                commands::shortcuts::register_left_sidebar_shortcut(app.handle(), left_shortcut)?;

                // Right sidebar shortcut
                let saved_right = commands::preferences::load_right_sidebar_shortcut(app.handle());
                let right_shortcut = saved_right
                    .as_deref()
                    .unwrap_or(types::DEFAULT_RIGHT_SIDEBAR_SHORTCUT);
                tracing::info!("Registering right sidebar shortcut: {right_shortcut}");
                commands::shortcuts::register_right_sidebar_shortcut(app.handle(), right_shortcut)?;
            }

            // Create the quick pane window (hidden) - must be done on main thread
            if let Err(e) = commands::quick_pane::init_quick_pane(app.handle()) {
                tracing::error!("Failed to create quick pane: {e}");
                // Non-fatal: app can still run without quick pane
            }

            // Set up system tray
            let tray_menu = MenuBuilder::new(app)
                .item(&MenuItemBuilder::with_id("show", "Show Window").build(app)?)
                .separator()
                .item(&MenuItemBuilder::with_id("quit", "Quit").build(app)?)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .cloned()
                        .expect("tauri.conf.json must set a window icon"),
                )
                .menu(&tray_menu)
                .on_menu_event(|app_handle, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app_handle.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray_icon, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray_icon.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            tracing::info!("System tray initialized");

            // Initialize SQL plugin (SQLite)
            #[cfg(desktop)]
            {
                let db_path = app
                    .path()
                    .app_data_dir()
                    .map(|p| p.join("app.db"))
                    .expect("failed to resolve app data dir");

                let migrations = vec![tauri_plugin_sql::Migration {
                    version: 1,
                    description: "create_initial_tables",
                    sql: include_str!("../migrations/001_initial.sql"),
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }];

                app.handle().plugin(
                    tauri_plugin_sql::Builder::new()
                        .add_migrations("sqlite:app.db", migrations)
                        .build(),
                )?;

                // Initialize sqlx pool for Rust-side database access
                let db_path = db_path.to_string_lossy().to_string();
                let pool = tauri::async_runtime::block_on(async {
                    let pool = sqlx::SqlitePool::connect(&format!("sqlite:{db_path}?mode=rwc"))
                        .await
                        .expect("failed to connect to SQLite database");

                    // Run migrations against the sqlx pool
                    sqlx::query(
                        "CREATE TABLE IF NOT EXISTS notes (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          title TEXT NOT NULL,
                          content TEXT NOT NULL DEFAULT '',
                          created_at TEXT NOT NULL DEFAULT (datetime('now')),
                          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                        )",
                    )
                    .execute(&pool)
                    .await
                    .expect("failed to create notes table");

                    sqlx::query(
                        "CREATE TRIGGER IF NOT EXISTS notes_updated_at
                          AFTER UPDATE ON notes
                          FOR EACH ROW
                        BEGIN
                          UPDATE notes SET updated_at = datetime('now') WHERE id = OLD.id;
                        END",
                    )
                    .execute(&pool)
                    .await
                    .expect("failed to create notes trigger");

                    pool
                });
                app.manage(commands::database::DbState(pool));

                tracing::info!("SQLite database initialized");
            }

            // Handle CLI arguments
            #[cfg(desktop)]
            {
                use tauri_plugin_cli::CliExt;

                if let Ok(matches) = app.cli().matches() {
                    // --reset-config: Delete preferences.json so defaults are used on next start
                    if let Some(arg) = matches.args.get("reset-config") {
                        if arg.value.as_bool().unwrap_or(false) {
                            if let Ok(data_dir) = app.path().app_data_dir() {
                                let prefs_path = data_dir.join("preferences.json");
                                if prefs_path.exists() {
                                    let _ = std::fs::remove_file(&prefs_path);
                                    println!("Preferences reset to defaults.");
                                }
                            }
                        }
                    }

                    // --debug: Open DevTools (useful in release builds)
                    if let Some(arg) = matches.args.get("debug") {
                        if arg.value.as_bool().unwrap_or(false) {
                            if let Some(window) = app.get_webview_window("main") {
                                #[cfg(not(debug_assertions))]
                                window.open_devtools();
                                let _ = window; // suppress unused warning in debug builds
                            }
                        }
                    }

                    // --log-level: Log the requested level override
                    if let Some(arg) = matches.args.get("log-level") {
                        if let Some(level_str) = arg.value.as_str() {
                            tracing::info!("CLI log level override requested: {level_str}");
                        }
                    }
                }
            }

            // Drag-drop is handled from the frontend via
            // `getCurrentWindow().onDragDropEvent()` from @tauri-apps/api

            // NOTE: Application menu is built from JavaScript for i18n support
            // See src/lib/menu.ts for the menu implementation

            Ok(())
        })
        .invoke_handler(builder.invoke_handler())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match &event {
            // macOS: Hide the main window instead of quitting so the dock icon can reopen it
            // and the quick-pane shortcut works independently of the main window.
            // On other platforms, the close proceeds normally and the app exits.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" => {
                #[cfg(target_os = "macos")]
                {
                    api.prevent_close();

                    // Save window state before hiding
                    use tauri_plugin_window_state::{AppHandleExt, StateFlags};
                    if let Err(e) = app_handle.save_window_state(StateFlags::all()) {
                        tracing::warn!("Failed to save window state: {e}");
                    }

                    // Hide the window, not the app. app_handle.hide() calls NSApplication.hide()
                    // which sets system-level hidden state — showing an NSPanel while hidden
                    // causes macOS to unhide the entire app, including the main window.
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                        tracing::info!("Main window hidden");
                    }
                }
            }

            // macOS: Dock icon clicked — reopen the main window if it was hidden
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => {
                if let Some(window) = app_handle.get_webview_window("main") {
                    if !window.is_visible().unwrap_or(true) {
                        let _ = window.show();

                        // The window-state plugin only auto-restores on app startup, not after
                        // a hide/show cycle. Without this the window can appear at stale coords.
                        use tauri_plugin_window_state::{StateFlags, WindowExt};
                        let _ = window.restore_state(StateFlags::all());

                        let _ = window.set_focus();
                        tracing::info!("Main window reopened from dock");
                    }
                }
            }

            // Cleanup on actual exit (Cmd+Q, menu Quit, or window close on non-macOS).
            // RunEvent::Exit fires reliably before the process exits, unlike ExitRequested
            // which doesn't fire for Cmd+Q on macOS (tauri-apps/tauri#9198).
            RunEvent::Exit => {
                tracing::info!("Application exiting — performing cleanup");

                // Hide the quick-pane panel to prevent crashes during teardown
                #[cfg(target_os = "macos")]
                {
                    use tauri_nspanel::ManagerExt;
                    if let Ok(panel) = app_handle.get_webview_panel("quick-pane") {
                        panel.hide();
                    }
                }

                // Unregister global shortcuts
                #[cfg(desktop)]
                {
                    use tauri_plugin_global_shortcut::GlobalShortcutExt;
                    if let Err(e) = app_handle.global_shortcut().unregister_all() {
                        tracing::warn!("Failed to unregister global shortcuts: {e}");
                    }
                }

                tracing::info!("Cleanup complete");
            }

            _ => {}
        });
}
