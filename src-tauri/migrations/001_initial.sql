CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS notes_updated_at
  AFTER UPDATE ON notes
  FOR EACH ROW
BEGIN
  UPDATE notes SET updated_at = datetime('now') WHERE id = OLD.id;
END;
