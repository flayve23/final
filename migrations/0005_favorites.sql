CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id INTEGER NOT NULL,
  streamer_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(viewer_id, streamer_id),
  FOREIGN KEY (viewer_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id)
);
