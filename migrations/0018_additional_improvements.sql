-- 0018_additional_improvements.sql
-- SPRINT 7: Tabelas adicionais (Afiliados, Gamificação)

-- ===========================
-- PROGRAMA DE AFILIADOS
-- ===========================

CREATE TABLE affiliates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  affiliate_code TEXT NOT NULL UNIQUE,
  commission_rate REAL DEFAULT 0.10,
  total_referrals INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_affiliates_user ON affiliates(user_id);
CREATE INDEX idx_affiliates_code ON affiliates(affiliate_code);

CREATE TABLE affiliate_referrals (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

CREATE INDEX idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);

CREATE TABLE affiliate_commissions (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  commission_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

CREATE INDEX idx_affiliate_commissions_affiliate ON affiliate_commissions(affiliate_id);

-- ===========================
-- GAMIFICAÇÃO
-- ===========================

ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_xp_earned INTEGER DEFAULT 0;

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mission_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  expires_at INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE user_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  UNIQUE(user_id, mission_id)
);

CREATE INDEX idx_user_missions_user ON user_missions(user_id);

-- Inserir conquistas iniciais
INSERT INTO achievements (id, name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
  ('ach_first_call', 'Primeira Chamada', 'Complete sua primeira chamada', '📞', 100, 'calls_completed', 1),
  ('ach_10_calls', 'Veterano', 'Complete 10 chamadas', '🎖️', 500, 'calls_completed', 10),
  ('ach_50_calls', 'Profissional', 'Complete 50 chamadas', '👑', 2000, 'calls_completed', 50),
  ('ach_first_rating', 'Bem Avaliado', 'Receba sua primeira avaliação 5 estrelas', '⭐', 200, 'five_star_ratings', 1),
  ('ach_10_favorites', 'Popular', 'Seja favoritado por 10 pessoas', '❤️', 1000, 'favorites_count', 10);

-- Inserir missões iniciais
INSERT INTO missions (id, title, description, mission_type, target_value, xp_reward) VALUES
  ('mission_daily_call', 'Missão Diária: Faça uma chamada', 'Complete uma chamada hoje', 'daily_calls', 1, 50),
  ('mission_weekly_5calls', 'Missão Semanal: 5 Chamadas', 'Complete 5 chamadas esta semana', 'weekly_calls', 5, 300),
  ('mission_receive_gift', 'Receba um Presente', 'Receba seu primeiro presente virtual', 'gifts_received', 1, 100);

-- ===========================
-- NOTIFICAÇÕES PUSH
-- ===========================

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ===========================
-- MELHORIAS EM NOTIFICAÇÕES
-- ===========================

ALTER TABLE notifications ADD COLUMN is_push_sent INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN push_sent_at INTEGER;
ALTER TABLE notifications ADD COLUMN action_url TEXT;

-- ===========================
-- ANALYTICS AVANÇADO
-- ===========================

CREATE TABLE viewer_sessions (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  session_start INTEGER NOT NULL,
  session_end INTEGER,
  pages_viewed INTEGER DEFAULT 0,
  streamers_viewed TEXT,
  device_type TEXT,
  browser TEXT,
  FOREIGN KEY (viewer_id) REFERENCES users(id)
);

CREATE INDEX idx_viewer_sessions_viewer ON viewer_sessions(viewer_id);
CREATE INDEX idx_viewer_sessions_start ON viewer_sessions(session_start);
