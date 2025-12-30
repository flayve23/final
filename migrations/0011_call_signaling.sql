-- Tabela para gerenciar o "toque" do telefone
CREATE TABLE IF NOT EXISTS call_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id INTEGER NOT NULL,
  streamer_id INTEGER NOT NULL,
  status TEXT DEFAULT 'ringing', -- ringing, accepted, rejected, missed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_requests_streamer ON call_requests(streamer_id, status);
