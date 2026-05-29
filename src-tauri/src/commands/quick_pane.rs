//! Quick pane window management commands.
//!
//! The quick pane is a floating panel (NSPanel on macOS, standard window elsewhere)
//! that provides quick entry functionality accessible via global shortcut.

use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl};

use crate::types::DEFAULT_QUICK_PANE_SHORTCUT;

// ============================================================================
// Constants
// ============================================================================

/// Window label for the quick pane
const QUICK_PANE_LABEL: &str = "quick-pane";

/// Quick pane window dimensions (logical pixels)
const QUICK_PANE_WIDTH: f64 = 500.0;
const QUICK_PANE_HEIGHT: f64 = 72.0;

/// Tracks the currently registered quick pane shortcut for selective unregistration.
static CURRENT_QUICK_PANE_SHORTCUT: Mutex<Option<String>> = Mutex::new(None);

// ============================================================================
// macOS-specific: NSPanel + native positioning
// ============================================================================

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelBuilder, PanelLevel, StyleMask,
};

#[cfg(target_os = "macos")]
use tauri_nspanel::objc2::class;

// Define custom panel class for quick pane (macOS only)
#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(QuickPanePanel {
        config: {
            can_become_key_window: true,
            can_become_main_window: false,
            is_floating_panel: true
        }
    })
}

// ============================================================================
// Window Initialization
// ============================================================================

/// Creates the quick pane window at app startup.
/// Must be called from the main thread (e.g., in setup()).
/// The window starts hidden and is shown via show_quick_pane command.
pub fn init_quick_pane(app: &AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        init_quick_pane_macos(app)
    }

    #[cfg(not(target_os = "macos"))]
    {
        init_quick_pane_standard(app)
    }
}

/// Creates the quick pane as an NSPanel on macOS (hidden).
#[cfg(target_os = "macos")]
fn init_quick_pane_macos(app: &AppHandle) -> Result<(), String> {
    use tauri::{LogicalSize, Size};

    tracing::debug!("Creating quick pane as NSPanel (macOS)");

    let panel = PanelBuilder::<_, QuickPanePanel>::new(app, QUICK_PANE_LABEL)
        .url(WebviewUrl::App("quick-pane.html".into()))
        .title("Quick Entry")
        .size(Size::Logical(LogicalSize::new(
            QUICK_PANE_WIDTH,
            QUICK_PANE_HEIGHT,
        )))
        .level(PanelLevel::Status)
        .transparent(true)
        .has_shadow(true)
        .collection_behavior(
            CollectionBehavior::new()
                .full_screen_auxiliary()
                .can_join_all_spaces(),
        )
        .style_mask(StyleMask::empty().nonactivating_panel())
        .hides_on_deactivate(false)
        .works_when_modal(true)
        .with_window(|w| {
            w.decorations(false)
                .transparent(true)
                .skip_taskbar(true)
                .resizable(false)
        })
        .build()
        .map_err(|e| format!("Failed to create quick pane panel: {e}"))?;

    panel.hide();
    tracing::info!("Quick pane NSPanel created (hidden)");
    Ok(())
}

/// Creates the quick pane as a standard Tauri window (hidden) on non-macOS platforms.
#[cfg(not(target_os = "macos"))]
fn init_quick_pane_standard(app: &AppHandle) -> Result<(), String> {
    use tauri::webview::WebviewWindowBuilder;

    tracing::debug!("Creating quick pane as standard window");

    WebviewWindowBuilder::new(
        app,
        QUICK_PANE_LABEL,
        WebviewUrl::App("quick-pane.html".into()),
    )
    .title("Quick Entry")
    .inner_size(QUICK_PANE_WIDTH, QUICK_PANE_HEIGHT)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .transparent(true)
    .visible(false)
    .resizable(false)
    .center()
    .build()
    .map_err(|e| format!("Failed to create quick pane window: {e}"))?;

    tracing::info!("Quick pane window created (hidden)");
    Ok(())
}

// ============================================================================
// Window Positioning
// ============================================================================

/// Positions the quick pane centered on the monitor containing the cursor.
///
/// On macOS, uses native NSWindow API to set the frame in screen coordinates,
/// because NSPanels ignore regular WebviewWindow::set_position calls.
#[cfg(target_os = "macos")]
fn position_quick_pane_on_cursor_monitor(app: &AppHandle) {
    // Get the quick pane WebviewWindow (tauri_nspanel registers it in the window manager)
    let window = match app.get_webview_window(QUICK_PANE_LABEL) {
        Some(w) => w,
        None => {
            tracing::warn!("Quick pane window not found in manager");
            return;
        }
    };

    // Get NSWindow pointer via macos-private-api
    let ns_window = match window.ns_window() {
        Ok(w) => w as *mut AnyObject,
        Err(e) => {
            tracing::warn!("Failed to get NSWindow: {e}");
            return;
        }
    };

    // Get cursor position (Tauri physical coords: origin top-left of primary)
    let cursor = match app.cursor_position() {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!("Failed to get cursor position: {e}");
            return;
        }
    };

    unsafe {
        // Get primary screen to convert Tauri coords → macOS screen coords
        // macOS: (0,0) = bottom-left of primary screen; y increases upward
        // Tauri: (0,0) = top-left of primary screen; y increases downward
        let primary: *mut AnyObject = msg_send![class!(NSScreen), mainScreen];
        let primary_frame: NSRect = msg_send![primary, frame];
        let total_height = primary_frame.origin.y + primary_frame.size.height;

        let mac_cursor_x = cursor.x;
        let mac_cursor_y = total_height - cursor.y;

        // Find which NSScreen contains the cursor
        let screens: *mut AnyObject = msg_send![class!(NSScreen), screens];
        let count: u64 = msg_send![screens, count];

        for i in 0..count {
            let screen: *mut AnyObject = msg_send![screens, objectAtIndex: i];
            let frame: NSRect = msg_send![screen, frame];

            if mac_cursor_x >= frame.origin.x
                && mac_cursor_x < frame.origin.x + frame.size.width
                && mac_cursor_y >= frame.origin.y
                && mac_cursor_y < frame.origin.y + frame.size.height
            {
                // Found the cursor's screen; calculate centered frame
                // NSScreen.frame and setFrameOrigin both operate in points (logical pixels),
                // and QUICK_PANE_WIDTH/HEIGHT are already in logical pixels — no scale needed.
                let x = frame.origin.x + (frame.size.width - QUICK_PANE_WIDTH) / 2.0;
                let y = frame.origin.y + (frame.size.height - QUICK_PANE_HEIGHT) / 2.0;

                let origin = NSPoint { x, y };
                let _: () = msg_send![ns_window, setFrameOrigin: origin];
                tracing::debug!("Quick pane positioned at ({x:.0}, {y:.0}) on screen {i}");
                return;
            }
        }

        // Fallback: center on the screen the window is currently on
        tracing::warn!("Cursor not within any NSScreen frame; centering window");
        let _: () = msg_send![ns_window, center];
    }
}

/// Positions the quick pane centered on the monitor containing the cursor (non-macOS).
#[cfg(not(target_os = "macos"))]
fn position_quick_pane_on_cursor_monitor(app: &AppHandle) {
    let cursor_pos = match app.cursor_position() {
        Ok(pos) => pos,
        Err(e) => {
            tracing::warn!("Failed to get cursor position: {e}");
            return;
        }
    };

    let monitor = match app.monitor_from_point(cursor_pos.x, cursor_pos.y) {
        Ok(Some(m)) => m,
        Ok(None) | Err(_) => {
            tracing::warn!("No monitor at cursor, falling back to primary");
            match app.primary_monitor().ok().flatten() {
                Some(m) => m,
                None => return,
            }
        }
    };

    let monitor_pos = monitor.position();
    let monitor_size = monitor.size();
    let scale = monitor.scale_factor();

    let win_w = (QUICK_PANE_WIDTH * scale) as i32;
    let win_h = (QUICK_PANE_HEIGHT * scale) as i32;

    let x = monitor_pos.x + (monitor_size.width as i32 - win_w) / 2;
    let y = monitor_pos.y + (monitor_size.height as i32 - win_h) / 2;

    let position = tauri::PhysicalPosition::new(x, y);

    if let Some(window) = app.get_webview_window(QUICK_PANE_LABEL) {
        if let Err(e) = window.set_position(position) {
            tracing::warn!("Failed to set position: {e}");
        } else {
            tracing::debug!("Quick pane positioned at ({x}, {y})");
        }
    }
}

// ============================================================================
// Window Visibility
// ============================================================================

/// Returns whether the quick pane is currently visible.
fn is_quick_pane_visible(app: &AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        app.get_webview_panel(QUICK_PANE_LABEL)
            .map(|panel| panel.is_visible())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "macos"))]
    {
        app.get_webview_window(QUICK_PANE_LABEL)
            .and_then(|window| window.is_visible().ok())
            .unwrap_or(false)
    }
}

/// Shows the quick pane window and makes it the key window (for keyboard input).
#[tauri::command]
#[specta::specta]
pub fn show_quick_pane(app: AppHandle) -> Result<(), String> {
    tracing::info!("Showing quick pane window");

    // Position before showing (sets the frame before the window becomes visible)
    position_quick_pane_on_cursor_monitor(&app);

    #[cfg(target_os = "macos")]
    {
        let panel = app
            .get_webview_panel(QUICK_PANE_LABEL)
            .map_err(|e| format!("Quick pane panel not found: {e:?}"))?;
        panel.show_and_make_key();
        // Position again after showing — some window managers ignore pre-show positioning
        position_quick_pane_on_cursor_monitor(&app);
        tracing::debug!("Quick pane panel shown (macOS)");
    }

    #[cfg(not(target_os = "macos"))]
    {
        let window = app.get_webview_window(QUICK_PANE_LABEL).ok_or_else(|| {
            "Quick pane window not found - was init_quick_pane called at startup?".to_string()
        })?;
        window
            .show()
            .map_err(|e| format!("Failed to show window: {e}"))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {e}"))?;
        // Position after showing to ensure monitor-aware centering
        position_quick_pane_on_cursor_monitor(&app);
        tracing::debug!("Quick pane window shown");
    }

    Ok(())
}

/// Dismisses the quick pane window.
/// On macOS, resigns key window status before hiding to avoid activating main window.
#[tauri::command]
#[specta::specta]
pub fn dismiss_quick_pane(app: AppHandle) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(panel) = app.get_webview_panel(QUICK_PANE_LABEL) {
            // Guard: resign_key_window triggers blur event which calls dismiss again
            if !panel.is_visible() {
                return Ok(());
            }
            tracing::info!("Dismissing quick pane window");
            // Resign key window BEFORE hiding to prevent macOS from
            // activating our main window (which would cause space switching)
            panel.resign_key_window();
            panel.hide();
            tracing::debug!("Quick pane panel dismissed (macOS)");
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        if let Some(window) = app.get_webview_window(QUICK_PANE_LABEL) {
            let is_visible = window.is_visible().unwrap_or(false);
            if !is_visible {
                tracing::debug!("Quick pane already hidden, skipping");
                return Ok(());
            }
            tracing::info!("Dismissing quick pane window");
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {e}"))?;
            tracing::debug!("Quick pane window hidden");
        }
    }

    Ok(())
}

/// Toggles the quick pane window visibility.
#[tauri::command]
#[specta::specta]
pub fn toggle_quick_pane(app: AppHandle) -> Result<(), String> {
    tracing::info!("Toggling quick pane window");

    if is_quick_pane_visible(&app) {
        dismiss_quick_pane(app)
    } else {
        show_quick_pane(app)
    }
}

// ============================================================================
// Shortcut Management
// ============================================================================

/// Registers the quick pane global shortcut, unregistering any previously registered one.
/// This helper is used by both setup() and update_quick_pane_shortcut() for consistency.
#[cfg(desktop)]
pub fn register_quick_pane_shortcut(app: &AppHandle, shortcut: &str) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

    let global_shortcut = app.global_shortcut();

    // Lock the mutex to get the current shortcut and update it atomically
    let mut current_shortcut = CURRENT_QUICK_PANE_SHORTCUT
        .lock()
        .map_err(|e| format!("Failed to lock shortcut mutex: {e}"))?;

    // Unregister the old shortcut if one exists
    if let Some(old_shortcut_str) = current_shortcut.take() {
        tracing::debug!("Unregistering old quick pane shortcut: {old_shortcut_str}");
        // Parse the old shortcut string into a Shortcut
        match old_shortcut_str.parse::<Shortcut>() {
            Ok(old_shortcut) => {
                if let Err(e) = global_shortcut.unregister(old_shortcut) {
                    tracing::warn!("Failed to unregister old shortcut '{old_shortcut_str}': {e}");
                    // Continue anyway - the old shortcut may have already been unregistered
                }
            }
            Err(e) => {
                tracing::warn!("Failed to parse old shortcut '{old_shortcut_str}': {e}");
                // Continue anyway - if we can't parse it, we can't unregister it
            }
        }
    }

    // Register the new shortcut
    let app_handle = app.clone();
    global_shortcut
        .on_shortcut(shortcut, move |_app, _shortcut, event| {
            use tauri_plugin_global_shortcut::ShortcutState;
            if event.state == ShortcutState::Pressed {
                tracing::info!("Quick pane shortcut triggered");
                if let Err(e) = toggle_quick_pane(app_handle.clone()) {
                    tracing::error!("Failed to toggle quick pane: {e}");
                }
            }
        })
        .map_err(|e| format!("Failed to register shortcut '{shortcut}': {e}"))?;

    // Store the new shortcut for future unregistration
    *current_shortcut = Some(shortcut.to_string());
    tracing::debug!("Registered quick pane shortcut: {shortcut}");

    Ok(())
}

/// Returns the default shortcut constant for frontend use.
#[tauri::command]
#[specta::specta]
pub fn get_default_quick_pane_shortcut() -> String {
    DEFAULT_QUICK_PANE_SHORTCUT.to_string()
}

/// Updates the global shortcut for the quick pane.
/// Pass None to reset to default.
#[tauri::command]
#[specta::specta]
pub fn update_quick_pane_shortcut(app: AppHandle, shortcut: Option<String>) -> Result<(), String> {
    #[cfg(desktop)]
    {
        let new_shortcut = shortcut.as_deref().unwrap_or(DEFAULT_QUICK_PANE_SHORTCUT);
        tracing::info!("Updating quick pane shortcut to: {new_shortcut}");

        register_quick_pane_shortcut(&app, new_shortcut)?;

        tracing::info!("Quick pane shortcut updated successfully");
    }

    #[cfg(not(desktop))]
    {
        let _ = (app, shortcut);
        tracing::warn!("Global shortcuts not supported on this platform");
    }

    Ok(())
}
