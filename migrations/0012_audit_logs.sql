-- V104: Audit Logs e Melhorias de Segurança
-- Criado em: 2025-12-31

-- Tabela de Logs de Auditoria (rastrear ações de admin)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'ban_user', 'approve_kyc', 'reject_kyc', 'update_commission', etc
  target_user_id INTEGER, -- Usuário afetado pela ação
  details TEXT, -- JSON com informações extras
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX idx_audit_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_target ON audit_logs(target_user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Adicionar campo para upload de documentos KYC
ALTER TABLE kyc_verifications ADD COLUMN document_front_url TEXT;
ALTER TABLE kyc_verifications ADD COLUMN document_back_url TEXT;
ALTER TABLE kyc_verifications ADD COLUMN selfie_url TEXT;

-- Adicionar data de nascimento para verificação 18+
ALTER TABLE users ADD COLUMN birth_date DATE;
ALTER TABLE users ADD COLUMN anonymous_mode BOOLEAN DEFAULT 0;

-- Adicionar campo de bloqueio de streamers (privacy)
CREATE TABLE IF NOT EXISTS blocked_streamers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  viewer_id INTEGER NOT NULL,
  streamer_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(viewer_id, streamer_id),
  FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (streamer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_blocked_viewer ON blocked_streamers(viewer_id);
