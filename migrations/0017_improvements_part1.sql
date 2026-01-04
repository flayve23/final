-- 0017_improvements_part1.sql
-- SPRINT 7: MELHORIAS (Parte 1) - Chat, Agendamento, Presentes, Premium, Alertas

-- ===========================
-- 1. CHAT EM TEMPO REAL
-- ===========================

CREATE TABLE chat_rooms (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',  -- text, gif, sticker, system
  metadata TEXT,  -- JSON: gif_url, sticker_id, etc
  is_deleted INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ===========================
-- 2. PRESENTES VIRTUAIS
-- ===========================

CREATE TABLE gift_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  price REAL NOT NULL,  -- Preço em R$
  rarity TEXT DEFAULT 'common',  -- common, rare, epic, legendary
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE gift_transactions (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  gift_id TEXT NOT NULL,
  call_id TEXT,
  amount REAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'sent',  -- sent, delivered
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (gift_id) REFERENCES gift_catalog(id),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX idx_gift_transactions_receiver ON gift_transactions(receiver_id);
CREATE INDEX idx_gift_transactions_sender ON gift_transactions(sender_id);

-- Inserir presentes iniciais
INSERT INTO gift_catalog (id, name, description, image_url, price, rarity) VALUES
  ('gift_rose', '🌹 Rosa', 'Uma rosa vermelha romântica', '/gifts/rose.png', 5.00, 'common'),
  ('gift_heart', '❤️ Coração', 'Coração cheio de amor', '/gifts/heart.png', 10.00, 'common'),
  ('gift_diamond', '💎 Diamante', 'Diamante brilhante', '/gifts/diamond.png', 50.00, 'rare'),
  ('gift_crown', '👑 Coroa', 'Coroa de ouro', '/gifts/crown.png', 100.00, 'epic'),
  ('gift_rocket', '🚀 Foguete', 'Foguete espacial', '/gifts/rocket.png', 200.00, 'legendary');

-- ===========================
-- 3. AGENDAMENTO DE DISPONIBILIDADE
-- ===========================

CREATE TABLE streamer_schedules (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=Domingo, 1=Segunda, ..., 6=Sábado
  start_time TEXT NOT NULL,  -- HH:MM formato 24h
  end_time TEXT NOT NULL,  -- HH:MM formato 24h
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (streamer_id) REFERENCES users(id)
);

CREATE INDEX idx_streamer_schedules_streamer ON streamer_schedules(streamer_id);
CREATE INDEX idx_streamer_schedules_day ON streamer_schedules(day_of_week);

CREATE TABLE scheduled_absences (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL,
  start_date TEXT NOT NULL,  -- YYYY-MM-DD
  end_date TEXT NOT NULL,  -- YYYY-MM-DD
  reason TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (streamer_id) REFERENCES users(id)
);

CREATE INDEX idx_scheduled_absences_streamer ON scheduled_absences(streamer_id);

-- ===========================
-- 4. PLANO PREMIUM
-- ===========================

ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN premium_since INTEGER;
ALTER TABLE users ADD COLUMN premium_until INTEGER;

CREATE TABLE premium_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_type TEXT NOT NULL,  -- monthly, yearly
  amount REAL NOT NULL,
  status TEXT DEFAULT 'active',  -- active, canceled, expired
  payment_method TEXT,  -- mercado_pago, credit_card
  payment_id TEXT,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  canceled_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_premium_subscriptions_user ON premium_subscriptions(user_id);
CREATE INDEX idx_premium_subscriptions_status ON premium_subscriptions(status);

-- Benefícios Premium (para referência, gerenciado no código)
-- - Sem taxa da plataforma (0% ao invés de 25%)
-- - Destaque no topo da busca
-- - Badge premium no perfil
-- - Limites de saque aumentados
-- - Prioridade no suporte
-- - Analytics avançado

-- ===========================
-- 5. ALERTAS DE STREAMER ONLINE
-- ===========================

CREATE TABLE online_alerts (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  streamer_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_notified_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (viewer_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  UNIQUE(viewer_id, streamer_id)
);

CREATE INDEX idx_online_alerts_viewer ON online_alerts(viewer_id);
CREATE INDEX idx_online_alerts_streamer ON online_alerts(streamer_id);

-- ===========================
-- 6. NOTAS PRIVADAS (VIEWER)
-- ===========================

CREATE TABLE private_notes (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  streamer_id TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (viewer_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  UNIQUE(viewer_id, streamer_id)
);

CREATE INDEX idx_private_notes_viewer ON private_notes(viewer_id);

-- ===========================
-- 7. HISTÓRICO DE CHAMADAS DETALHADO
-- ===========================

ALTER TABLE calls ADD COLUMN quality_rating INTEGER;  -- 1-5 estrelas
ALTER TABLE calls ADD COLUMN connection_issues INTEGER DEFAULT 0;
ALTER TABLE calls ADD COLUMN reconnections INTEGER DEFAULT 0;

CREATE TABLE call_events (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- started, ended, quality_issue, reconnection, error
  description TEXT,
  metadata TEXT,  -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX idx_call_events_call ON call_events(call_id);
CREATE INDEX idx_call_events_type ON call_events(event_type);

-- ===========================
-- 8. BUSCA AVANÇADA (ADMIN)
-- ===========================

-- Índices para otimizar buscas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at);

CREATE INDEX idx_wallet_transactions_type ON wallet_transactions(transaction_type);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_created ON wallet_transactions(created_at);

-- ===========================
-- 9. SUPORTE MULTILÍNGUE
-- ===========================

ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'pt-BR';

CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  language TEXT NOT NULL,  -- pt-BR, en-US, es-ES
  value TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(key, language)
);

CREATE INDEX idx_translations_key ON translations(key);
CREATE INDEX idx_translations_language ON translations(language);

-- ===========================
-- 10. MODO ANÔNIMO
-- ===========================

ALTER TABLE calls ADD COLUMN is_anonymous INTEGER DEFAULT 0;
ALTER TABLE calls ADD COLUMN anonymous_viewer_name TEXT;

-- ===========================
-- FINAL
-- ===========================

-- Criar view de streamers disponíveis
CREATE VIEW available_streamers AS
SELECT 
  u.id,
  u.display_name,
  u.bio,
  u.avatar_url,
  u.price_per_minute,
  u.is_online,
  u.is_premium,
  u.rating,
  COUNT(DISTINCT r.id) as review_count,
  COUNT(DISTINCT c.id) as total_calls
FROM users u
LEFT JOIN reviews r ON u.id = r.streamer_id AND r.is_visible = 1
LEFT JOIN calls c ON u.id = c.streamer_id AND c.status = 'completed'
WHERE u.role = 'streamer'
  AND u.is_available = 1
  AND u.is_online = 1
  AND u.kyc_status = 'approved'
GROUP BY u.id;
