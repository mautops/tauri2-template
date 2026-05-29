//! Structured logging via `tracing` with file rotation, panic hooks, and
//! JSON output in release builds.

use std::path::{Path, PathBuf};
use tracing_appender::rolling::Rotation;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// Returns the app's log directory, creating it if needed.
fn log_dir(app_data: &Path) -> PathBuf {
    let dir = app_data.join("logs");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Returns the app's crash directory, creating it if needed.
fn crash_dir(app_data: &Path) -> PathBuf {
    let dir = app_data.join("crashes");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Initialize the tracing subscriber.
///
/// - Dev: pretty-printed to stdout at DEBUG level
/// - Release: JSON structured logs to rotating files
pub fn init(app_data_dir: PathBuf) {
    let log_path = log_dir(&app_data_dir);
    let file_appender = tracing_appender::rolling::Builder::new()
        .rotation(Rotation::DAILY)
        .filename_prefix("app")
        .filename_suffix("log")
        .max_log_files(7)
        .build(log_path)
        .expect("failed to create file appender");

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            EnvFilter::new("debug")
        } else {
            EnvFilter::new("info")
        }
    });

    if cfg!(debug_assertions) {
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
            .try_init()
            .ok(); // Silently ignore if already initialized (e.g., in tests)
    } else {
        let file_layer = fmt::layer()
            .json()
            .with_writer(file_appender)
            .with_filter(env_filter);
        tracing_subscriber::registry()
            .with(file_layer)
            .try_init()
            .ok(); // Silently ignore if already initialized (e.g., in tests)
    }
}

/// Install a custom panic hook that writes crash data before exit.
pub fn set_panic_hook(app_data_dir: PathBuf) {
    std::panic::set_hook(Box::new(move |info| {
        // Compute the crash path at panic time so the timestamp is accurate,
        // not baked in at startup (which could be hours earlier).
        let crash_path = {
            let dir = crash_dir(&app_data_dir);
            dir.join(format!(
                "crash-{}.log",
                chrono::Utc::now().format("%Y%m%dT%H%M%S")
            ))
        };
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

        let crash_entry = serde_json::json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "payload": payload,
            "location": location,
        });

        if let Ok(json) = serde_json::to_string_pretty(&crash_entry) {
            let _ = std::fs::write(&crash_path, json);
        }

        tracing::error!(panic.payload = payload, panic.location = %location, "Application panicked");
    }));
}
