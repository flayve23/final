-- =====================================================
-- SPRINT 4 - PARTE 1: ANALYTICS AVANÇADO
-- =====================================================

-- Tabela de eventos de analytics (tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL, -- 'call_started', 'call_ended', 'payment', 'registration', 'profile_view', etc
  user_id TEXT,
  streamer_id TEXT,
  metadata TEXT, -- JSON adicional (duration, amount, source, etc)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_streamer ON analytics_events(streamer_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);

-- View materializada: KPIs diários (para performance)
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
  date TEXT PRIMARY KEY, -- YYYY-MM-DD
  total_calls INTEGER DEFAULT 0,
  total_call_duration INTEGER DEFAULT 0, -- segundos
  total_revenue REAL DEFAULT 0.0,
  total_users_registered INTEGER DEFAULT 0,
  avg_call_duration REAL DEFAULT 0.0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SPRINT 4 - PARTE 3: FAVORITOS/BOOKMARKS
-- =====================================================

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  streamer_id TEXT NOT NULL,
  notify_on_online INTEGER DEFAULT 1, -- 1 = notificar quando streamer ficar online
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, streamer_id) -- Não pode favoritar o mesmo streamer 2x
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_streamer ON favorites(streamer_id);

-- =====================================================
-- SPRINT 4: MELHORIAS NAS TABELAS EXISTENTES
-- =====================================================

-- Adicionar coluna de última vez online (para favoritos)
ALTER TABLE profiles ADD COLUMN last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN is_online INTEGER DEFAULT 0;

-- Adicionar índices para performance de analytics
CREATE INDEX IF NOT EXISTS idx_calls_created_date ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_created_date ON transactions(created_at);

-- Trigger para atualizar last_seen_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_last_seen
AFTER UPDATE OF is_online ON profiles
WHEN NEW.is_online = 1
BEGIN
  UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
