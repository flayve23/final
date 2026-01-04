-- 0016_security_improvements.sql
-- SPRINT 6: MELHORIAS DE SEGURANÇA COMPLETAS

-- ===========================
-- 1. IDEMPOTÊNCIA DE TRANSAÇÕES
-- ===========================

-- Adicionar coluna de idempotency_key em wallet_transactions
ALTER TABLE wallet_transactions ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_wallet_transactions_idempotency ON wallet_transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ===========================
-- 2. LOCK DE PROCESSAMENTO
-- ===========================

-- Adicionar flag de processamento em wallets
ALTER TABLE wallets ADD COLUMN is_processing INTEGER DEFAULT 0;
CREATE INDEX idx_wallets_processing ON wallets(is_processing);

-- ===========================
-- 3. LIMITES DE SAQUE
-- ===========================

-- Adicionar limites personalizados por usuário
ALTER TABLE users ADD COLUMN withdrawal_limit_daily REAL DEFAULT 500;
ALTER TABLE users ADD COLUMN withdrawal_limit_monthly REAL DEFAULT 2000;
ALTER TABLE users ADD COLUMN withdrawal_limit_per_transaction REAL DEFAULT 5000;

-- ===========================
-- 4. FLAGS DE FRAUDE
-- ===========================

CREATE TABLE fraud_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  flag_type TEXT NOT NULL,  -- new_account_high_deposit, immediate_withdrawal, multiple_failed_kyc, chargeback_history, rapid_transactions, suspicious_pattern
  severity TEXT NOT NULL,  -- low, medium, high, critical
  description TEXT NOT NULL,
  metadata TEXT,  -- JSON com detalhes adicionais
  auto_generated INTEGER DEFAULT 1,  -- 1 = automático, 0 = manual
  reviewed INTEGER DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_fraud_flags_user ON fraud_flags(user_id);
CREATE INDEX idx_fraud_flags_severity ON fraud_flags(severity);
CREATE INDEX idx_fraud_flags_reviewed ON fraud_flags(reviewed);
CREATE INDEX idx_fraud_flags_created ON fraud_flags(created_at);

-- ===========================
-- 5. SAQUES PENDENTES DE APROVAÇÃO
-- ===========================

CREATE TABLE pending_withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  pix_key TEXT,
  pix_key_type TEXT,  -- cpf, email, phone, random
  bank_account TEXT,  -- JSON com dados bancários se não for Pix
  status TEXT DEFAULT 'pending_approval',  -- pending_approval, approved, rejected, processing, completed, failed
  fraud_flags TEXT,  -- JSON com flags detectados
  fraud_score REAL DEFAULT 0,  -- Score de 0-100 (0 = sem risco, 100 = alto risco)
  rejection_reason TEXT,
  admin_notes TEXT,
  approved_by TEXT,
  approved_at INTEGER,
  processed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX idx_pending_withdrawals_user ON pending_withdrawals(user_id);
CREATE INDEX idx_pending_withdrawals_status ON pending_withdrawals(status);
CREATE INDEX idx_pending_withdrawals_created ON pending_withdrawals(created_at);
CREATE INDEX idx_pending_withdrawals_fraud_score ON pending_withdrawals(fraud_score);

-- ===========================
-- 6. HISTÓRICO DE FRAUDES
-- ===========================

CREATE TABLE fraud_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  incident_type TEXT NOT NULL,  -- chargeback, duplicate_withdrawal, stolen_card, fake_kyc, account_takeover, money_laundering
  amount_lost REAL DEFAULT 0,
  description TEXT,
  evidence_urls TEXT,  -- JSON array de evidências
  status TEXT DEFAULT 'investigating',  -- investigating, confirmed, resolved, false_positive
  resolution TEXT,
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX idx_fraud_history_user ON fraud_history(user_id);
CREATE INDEX idx_fraud_history_status ON fraud_history(status);
CREATE INDEX idx_fraud_history_type ON fraud_history(incident_type);

-- ===========================
-- 7. RECONCILIAÇÃO FINANCEIRA
-- ===========================

CREATE TABLE reconciliation_reports (
  id TEXT PRIMARY KEY,
  report_date INTEGER NOT NULL,  -- Data do relatório (midnight UTC)
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  total_deposits REAL NOT NULL DEFAULT 0,
  total_withdrawals REAL NOT NULL DEFAULT 0,
  total_earnings REAL NOT NULL DEFAULT 0,
  total_spending REAL NOT NULL DEFAULT 0,
  platform_revenue REAL NOT NULL DEFAULT 0,  -- Comissão da plataforma
  expected_balance REAL NOT NULL DEFAULT 0,
  actual_balance REAL NOT NULL DEFAULT 0,
  discrepancy REAL NOT NULL DEFAULT 0,
  discrepancy_percentage REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'ok',  -- ok, warning, critical, investigating, resolved
  notes TEXT,
  investigated_by TEXT,
  investigated_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (investigated_by) REFERENCES users(id)
);

CREATE INDEX idx_reconciliation_date ON reconciliation_reports(report_date);
CREATE INDEX idx_reconciliation_status ON reconciliation_reports(status);

-- ===========================
-- 8. LOGS DE TENTATIVAS DE SAQUE
-- ===========================

CREATE TABLE withdrawal_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  success INTEGER DEFAULT 0,  -- 0 = failed, 1 = success
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  fraud_flags_detected TEXT,  -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_withdrawal_attempts_user ON withdrawal_attempts(user_id);
CREATE INDEX idx_withdrawal_attempts_created ON withdrawal_attempts(created_at);
CREATE INDEX idx_withdrawal_attempts_success ON withdrawal_attempts(success);

-- ===========================
-- 9. SISTEMA DE MODERAÇÃO (DENÚNCIAS)
-- ===========================

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  reported_id TEXT NOT NULL,
  report_type TEXT NOT NULL,  -- harassment, spam, nudity, fraud, violence, hate_speech, illegal_content, other
  category TEXT,  -- Subcategoria específica
  description TEXT NOT NULL,
  evidence_urls TEXT,  -- JSON array de screenshots/vídeos
  call_id TEXT,  -- Se denúncia foi durante chamada
  message_id TEXT,  -- Se denúncia foi de mensagem
  severity TEXT DEFAULT 'medium',  -- low, medium, high, critical
  status TEXT DEFAULT 'pending',  -- pending, reviewing, action_taken, dismissed, appealed
  priority INTEGER DEFAULT 0,  -- 0 = normal, 1 = alta, 2 = urgente
  admin_notes TEXT,
  action_taken TEXT,  -- warning, suspension, ban, content_removed, account_restricted, dismissed
  action_details TEXT,  -- JSON com detalhes da ação
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (reported_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_created ON reports(created_at);
CREATE INDEX idx_reports_priority ON reports(priority);

-- ===========================
-- 10. AÇÕES DE MODERAÇÃO
-- ===========================

CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL,  -- warning, suspension, ban, content_removal, account_restriction
  reason TEXT NOT NULL,
  report_id TEXT,  -- Referência à denúncia que originou a ação
  duration_days INTEGER,  -- NULL se permanente
  restrictions TEXT,  -- JSON com restrições específicas (ex: não pode enviar mensagens)
  is_active INTEGER DEFAULT 1,
  expires_at INTEGER,
  appealed INTEGER DEFAULT 0,
  appeal_text TEXT,
  appeal_resolved INTEGER DEFAULT 0,
  appeal_resolution TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (admin_id) REFERENCES users(id),
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX idx_moderation_actions_user ON moderation_actions(user_id);
CREATE INDEX idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX idx_moderation_actions_active ON moderation_actions(is_active);
CREATE INDEX idx_moderation_actions_expires ON moderation_actions(expires_at);

-- ===========================
-- 11. ALERTAS DE SEGURANÇA
-- ===========================

CREATE TABLE security_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT,  -- NULL se alerta global
  alert_type TEXT NOT NULL,  -- fraud_detected, unusual_activity, login_from_new_device, password_reset, withdrawal_blocked, account_compromised
  severity TEXT NOT NULL,  -- info, warning, critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,  -- JSON com detalhes
  acknowledged INTEGER DEFAULT 0,
  acknowledged_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_security_alerts_user ON security_alerts(user_id);
CREATE INDEX idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX idx_security_alerts_acknowledged ON security_alerts(acknowledged);

-- ===========================
-- 12. TAXA DE SAQUE (CONFIGURÁVEL)
-- ===========================

CREATE TABLE platform_fees (
  id TEXT PRIMARY KEY,
  fee_type TEXT NOT NULL UNIQUE,  -- withdrawal_fee, platform_commission, payment_processing, chargeback_fee
  fee_percentage REAL DEFAULT 0,
  fee_fixed REAL DEFAULT 0,  -- Valor fixo
  minimum_fee REAL DEFAULT 0,
  maximum_fee REAL,  -- NULL = sem limite
  applies_to TEXT DEFAULT 'all',  -- all, viewer, streamer, verified, unverified
  is_active INTEGER DEFAULT 1,
  description TEXT,
  updated_by TEXT,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Taxas padrão
INSERT INTO platform_fees (id, fee_type, fee_percentage, fee_fixed, description) VALUES
  ('fee_withdrawal', 'withdrawal_fee', 0, 2.00, 'Taxa fixa de saque (R$ 2,00)'),
  ('fee_platform', 'platform_commission', 30, 0, 'Comissão da plataforma (30%)'),
  ('fee_payment', 'payment_processing', 3.99, 0.40, 'Taxa Mercado Pago (3.99% + R$ 0,40)'),
  ('fee_chargeback', 'chargeback_fee', 0, 15.00, 'Taxa de chargeback (R$ 15,00)');

-- ===========================
-- 13. ATUALIZAÇÕES NA TABELA USERS
-- ===========================

-- Campos de segurança adicionais
ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';  -- active, suspended, banned, restricted, under_review
ALTER TABLE users ADD COLUMN suspension_reason TEXT;
ALTER TABLE users ADD COLUMN suspension_expires_at INTEGER;
ALTER TABLE users ADD COLUMN ban_reason TEXT;
ALTER TABLE users ADD COLUMN banned_at INTEGER;
ALTER TABLE users ADD COLUMN banned_by TEXT;
ALTER TABLE users ADD COLUMN risk_score REAL DEFAULT 0;  -- Score de risco 0-100
ALTER TABLE users ADD COLUMN last_risk_assessment INTEGER;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN account_locked_until INTEGER;
ALTER TABLE users ADD COLUMN password_changed_at INTEGER;
ALTER TABLE users ADD COLUMN requires_password_change INTEGER DEFAULT 0;

CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_risk_score ON users(risk_score);

-- ===========================
-- 14. SESSÕES DE USUÁRIO (TRACKING)
-- ===========================

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_country TEXT,
  location_city TEXT,
  is_active INTEGER DEFAULT 1,
  last_activity INTEGER DEFAULT (strftime('%s', 'now')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ===========================
-- 15. LISTA DE IPs BLOQUEADOS
-- ===========================

CREATE TABLE blocked_ips (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by TEXT NOT NULL,
  expires_at INTEGER,  -- NULL = permanente
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (blocked_by) REFERENCES users(id)
);

CREATE INDEX idx_blocked_ips_address ON blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_active ON blocked_ips(is_active);

-- ===========================
-- 16. WHITELIST DE IPs CONFIÁVEIS
-- ===========================

CREATE TABLE trusted_ips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  description TEXT,
  added_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_used INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_trusted_ips_user ON trusted_ips(user_id);
CREATE INDEX idx_trusted_ips_address ON trusted_ips(ip_address);

-- ===========================
-- FIM DA MIGRATION
-- ===========================
