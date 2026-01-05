-- =====================================================
-- FLAYVE v1.0.4 - TODAS AS MIGRATIONS (ORDEM CORRIGIDA)
-- =====================================================

-- ============================================================
-- MIGRATION 0001: Initial Schema (Base Tables)
-- ============================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('viewer', 'streamer', 'admin')),
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'earning', 'payment', 'refund')),
  amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);

-- Calls Table
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  room_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'ended', 'cancelled')),
  started_at INTEGER,
  ended_at INTEGER,
  duration INTEGER DEFAULT 0,
  rate_per_minute REAL NOT NULL,
  total_cost REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  FOREIGN KEY (viewer_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_calls_streamer ON calls(streamer_id);
CREATE INDEX IF NOT EXISTS idx_calls_viewer ON calls(viewer_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (call_id) REFERENCES calls(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_call ON reviews(call_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ============================================================
-- MIGRATION 0002: KYC System
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  document_type TEXT,
  document_number TEXT,
  selfie_url TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  rejection_reason TEXT,
  verified_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_verifications(status);

-- ============================================================
-- MIGRATION 0003: Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ============================================================
-- MIGRATION 0006: Favorites
-- ============================================================

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  streamer_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (viewer_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  UNIQUE(viewer_id, streamer_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_viewer ON favorites(viewer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_streamer ON favorites(streamer_id);

-- ============================================================
-- MIGRATION 0016: Security Improvements (Sprint 6)
-- ============================================================

-- Add columns to existing tables (using ALTER TABLE)
-- Note: SQLite doesn't support adding columns with NOT NULL and no default in one step

-- Add idempotency to wallet_transactions (AFTER table creation)
ALTER TABLE wallet_transactions ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_idempotency 
  ON wallet_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Add processing lock to wallets
ALTER TABLE wallets ADD COLUMN is_processing INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_wallets_processing ON wallets(is_processing);

-- Add withdrawal limits to users
ALTER TABLE users ADD COLUMN withdrawal_limit_daily REAL DEFAULT 500;
ALTER TABLE users ADD COLUMN withdrawal_limit_monthly REAL DEFAULT 2000;
ALTER TABLE users ADD COLUMN withdrawal_limit_per_transaction REAL DEFAULT 5000;
ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0;

-- Fraud Flags Table
CREATE TABLE IF NOT EXISTS fraud_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  metadata TEXT,
  auto_generated INTEGER DEFAULT 1,
  reviewed INTEGER DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON fraud_flags(severity);

-- Pending Withdrawals Table
CREATE TABLE IF NOT EXISTS pending_withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requires_2fa INTEGER DEFAULT 0,
  requires_approval INTEGER DEFAULT 0,
  idempotency_key TEXT UNIQUE NOT NULL,
  fraud_score INTEGER DEFAULT 0,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  processed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_user ON pending_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_withdrawals_status ON pending_withdrawals(status);

-- Moderation Reports Table
CREATE TABLE IF NOT EXISTS moderation_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  reviewed_by TEXT,
  reviewed_at INTEGER,
  action_taken TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_reports_priority ON moderation_reports(priority);

-- Reconciliation Reports Table
CREATE TABLE IF NOT EXISTS reconciliation_reports (
  id TEXT PRIMARY KEY,
  report_date TEXT NOT NULL,
  total_deposits REAL DEFAULT 0,
  total_withdrawals REAL DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  total_payments REAL DEFAULT 0,
  net_balance REAL DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_date ON reconciliation_reports(report_date);

-- ============================================================
-- MIGRATION 0017: Improvements Part 1 (Sprint 7)
-- ============================================================

-- Chat System
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  call_id TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);

-- Virtual Gifts Catalog
CREATE TABLE IF NOT EXISTS gift_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  icon TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

-- Gift Transactions
CREATE TABLE IF NOT EXISTS gift_transactions (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  gift_id TEXT NOT NULL,
  amount REAL NOT NULL,
  message TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id),
  FOREIGN KEY (gift_id) REFERENCES gift_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender ON gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_receiver ON gift_transactions(receiver_id);

-- Schedule System
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  UNIQUE(streamer_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_schedules_streamer ON schedules(streamer_id);

-- Premium Subscriptions
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK(plan_type IN ('monthly', 'annual')),
  status TEXT NOT NULL DEFAULT 'active',
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  auto_renew INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_premium_user ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_expires ON premium_subscriptions(expires_at);

-- Online Alerts
CREATE TABLE IF NOT EXISTS online_alerts (
  id TEXT PRIMARY KEY,
  viewer_id TEXT NOT NULL,
  streamer_id TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  FOREIGN KEY (viewer_id) REFERENCES users(id),
  FOREIGN KEY (streamer_id) REFERENCES users(id),
  UNIQUE(viewer_id, streamer_id)
);

CREATE INDEX IF NOT EXISTS idx_online_alerts_viewer ON online_alerts(viewer_id);

-- Private Notes
CREATE TABLE IF NOT EXISTS private_notes (
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

CREATE INDEX IF NOT EXISTS idx_private_notes_viewer ON private_notes(viewer_id);

-- Enhance Calls Table
ALTER TABLE calls ADD COLUMN rating REAL;
ALTER TABLE calls ADD COLUMN tags TEXT;

-- Affiliates System
CREATE TABLE IF NOT EXISTS affiliates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_earnings REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(referral_code);

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id TEXT PRIMARY KEY,
  affiliate_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  commission_earned REAL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (affiliate_id) REFERENCES affiliates(id),
  FOREIGN KEY (referred_user_id) REFERENCES users(id)
);

-- Gamification: User Levels
CREATE TABLE IF NOT EXISTS user_levels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_calls INTEGER DEFAULT 0,
  total_time INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Gamification: Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL
);

-- ============================================================
-- MIGRATION 0018: Additional Features
-- ============================================================

-- Add columns to users
ALTER TABLE users ADD COLUMN anonymous_mode_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'pt-BR';

-- ============================================================
-- SEED DATA: Gift Catalog
-- ============================================================

INSERT OR IGNORE INTO gift_catalog (id, name, description, price, icon, is_active) VALUES
  ('gift_rose', 'Rosa', 'Uma bela rosa virtual', 5.00, '🌹', 1),
  ('gift_heart', 'Coração', 'Demonstre seu carinho', 10.00, '❤️', 1),
  ('gift_star', 'Estrela', 'Você é uma estrela!', 15.00, '⭐', 1),
  ('gift_diamond', 'Diamante', 'Presente premium', 50.00, '💎', 1),
  ('gift_crown', 'Coroa', 'Para os melhores', 100.00, '👑', 1);

-- FIM DAS MIGRATIONS
