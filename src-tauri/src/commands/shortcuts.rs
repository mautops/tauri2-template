//! Global shortcut registration for sidebar toggles.
//!
//! Unlike the quick pane shortcut which toggles a window directly in Rust,
//! sidebar shortcuts emit events to the React frontend where sidebar state lives.

use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

use crate::types::{DEFAULT_LEFT_SIDEBAR_SHORTCUT, DEFAULT_RIGHT_SIDEBAR_SHORTCUT};

static CURRENT_LEFT_SIDEBAR_SHORTCUT: Mutex<Option<String>> = Mutex::new(None);
static CURRENT_RIGHT_SIDEBAR_SHORTCUT: Mutex<Option<String>> = Mutex::new(None);

#[cfg(desktop)]
fn register_sidebar_shortcut(
    app: &AppHandle,
    shortcut: &str,
    current_mutex: &Mutex<Option<String>>,
    event_name: &'static str,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

    let global_shortcut = app.global_shortcut();

    let mut current = current_mutex
        .lock()
        .map_err(|e| format!("Failed to lock shortcut mutex: {e}"))?;

    if let Some(old_str) = current.take() {
        tracing::debug!("Unregistering old {event_name} shortcut: {old_str}");
        if let Ok(old) = old_str.parse::<Shortcut>() {
            if let Err(e) = global_shortcut.unregister(old) {
                tracing::warn!("Failed to unregister old shortcut '{old_str}': {e}");
            }
        }
    }

    let app_handle = app.clone();
    global_shortcut
        .on_shortcut(shortcut, move |_app, _sc, event| {
            if event.state == ShortcutState::Pressed {
                tracing::info!("{event_name} shortcut triggered");
                let _ = app_handle.emit(event_name, ());
            }
        })
        .map_err(|e| format!("Failed to register shortcut '{shortcut}': {e}"))?;

    *current = Some(shortcut.to_string());
    tracing::debug!("Registered {event_name} shortcut: {shortcut}");

    Ok(())
}

#[cfg(desktop)]
pub fn register_left_sidebar_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    register_sidebar_shortcut(
        app,
        shortcut,
        &CURRENT_LEFT_SIDEBAR_SHORTCUT,
        "toggle-left-sidebar",
    )
}

#[cfg(desktop)]
pub fn register_right_sidebar_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    register_sidebar_shortcut(
        app,
        shortcut,
        &CURRENT_RIGHT_SIDEBAR_SHORTCUT,
        "toggle-right-sidebar",
    )
}

#[tauri::command]
#[specta::specta]
pub fn get_default_left_sidebar_shortcut() -> String {
    DEFAULT_LEFT_SIDEBAR_SHORTCUT.to_string()
}

#[tauri::command]
#[specta::specta]
pub fn get_default_right_sidebar_shortcut() -> String {
    DEFAULT_RIGHT_SIDEBAR_SHORTCUT.to_string()
}

#[tauri::command]
#[specta::specta]
pub fn update_left_sidebar_shortcut(
    app: AppHandle,
    shortcut: Option<String>,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let new_shortcut = shortcut.as_deref().unwrap_or(DEFAULT_LEFT_SIDEBAR_SHORTCUT);
        tracing::info!("Updating left sidebar shortcut to: {new_shortcut}");
        register_left_sidebar_shortcut(&app, new_shortcut)?;
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, shortcut);
        tracing::warn!("Global shortcuts not supported on this platform");
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn update_right_sidebar_shortcut(
    app: AppHandle,
    shortcut: Option<String>,
) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let new_shortcut = shortcut
            .as_deref()
            .unwrap_or(DEFAULT_RIGHT_SIDEBAR_SHORTCUT);
        tracing::info!("Updating right sidebar shortcut to: {new_shortcut}");
        register_right_sidebar_shortcut(&app, new_shortcut)?;
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, shortcut);
        tracing::warn!("Global shortcuts not supported on this platform");
    }

    Ok(())
}
