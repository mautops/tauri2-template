//! Database CRUD commands for notes.
//!
//! Uses sqlx directly with a managed SqlitePool state for type-safe database access.

use serde::{Deserialize, Serialize};
use specta::Type;
use sqlx::{FromRow, SqlitePool};
use tauri::{AppHandle, Manager};

/// Managed state holding the SQLite connection pool.
pub struct DbState(pub SqlitePool);

#[derive(Debug, Serialize, Deserialize, Type, Clone, FromRow)]
pub struct Note {
    pub id: i32,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Type)]
pub struct CreateNoteInput {
    pub title: String,
    pub content: String,
}

/// Fetch all notes ordered by creation date (newest first).
#[tauri::command]
#[specta::specta]
pub async fn get_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let state = app.state::<DbState>();
    let notes = sqlx::query_as::<_, Note>(
        "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY created_at DESC",
    )
    .fetch_all(&state.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(notes)
}

/// Create a new note with the given title and content.
#[tauri::command]
#[specta::specta]
pub async fn create_note(app: AppHandle, input: CreateNoteInput) -> Result<Note, String> {
    if input.title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    if input.title.len() > 200 {
        return Err("Title must be 200 characters or less".to_string());
    }

    let state = app.state::<DbState>();
    let title = input.title.trim().to_string();

    let note = sqlx::query_as::<_, Note>(
        "INSERT INTO notes (title, content) VALUES (?, ?) RETURNING id, title, content, created_at, updated_at",
    )
    .bind(&title)
    .bind(&input.content)
    .fetch_one(&state.0)
    .await
    .map_err(|e| e.to_string())?;

    Ok(note)
}

/// Delete a note by its ID.
#[tauri::command]
#[specta::specta]
pub async fn delete_note(app: AppHandle, id: i32) -> Result<(), String> {
    let state = app.state::<DbState>();

    sqlx::query("DELETE FROM notes WHERE id = ?")
        .bind(id)
        .execute(&state.0)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
