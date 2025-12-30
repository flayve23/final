-- Migration Fixed: is_online already exists, so we skipped adding it.

-- Ensure stories table exists (This is what we really need)
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  media_url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
