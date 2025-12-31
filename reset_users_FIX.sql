-- ============================================
-- RESET USERS - COMPATIBLE VERSION
-- ============================================
-- Gerado em: 2025-12-31
-- Compatível com schema original (sem bio_name/bio_description)
-- ============================================

-- LIMPAR DADOS EXISTENTES
DELETE FROM transactions;
DELETE FROM call_requests;
DELETE FROM calls;
DELETE FROM stories;
DELETE FROM favorites;
DELETE FROM referrals;
DELETE FROM kyc_verifications;
DELETE FROM profiles;
DELETE FROM users;

-- RESET AUTO INCREMENT
DELETE FROM sqlite_sequence WHERE name IN (
  'users', 'profiles', 'calls', 'call_requests',
  'transactions', 'stories', 'favorites', 'referrals', 'kyc_verifications'
);

-- CRIAR USUÁRIOS DE TESTE

-- 1. ADMIN
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'admin@flayve.com',
  'admin',
  'NoDAoal37wdZKq2ir4LLZSNO2RMZ0Wkn6zThDpGD/NQ=',
  'flayve_admin_salt_2025',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- 2. STREAMER
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'streamer@flayve.com',
  'streamer',
  '9+MSlOBLkkRAHS20aXE+NsJ3r/ffYEQa5TXygnV3Byc=',
  'flayve_streamer_salt_2025',
  'streamer',
  1,
  datetime('now'),
  datetime('now')
);

-- Perfil do Streamer (usando apenas colunas que existem no schema original)
INSERT INTO profiles (user_id, bio, price_per_minute, is_online, total_earnings, average_rating, total_ratings, created_at, updated_at)
VALUES (
  2,
  'Streamer profissional para testes. Preço: R$ 10/min. Disponível para chamadas privadas!',
  10.00,
  0,
  0.00,
  0.00,
  0,
  datetime('now'),
  datetime('now')
);

-- 3. VIEWER
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'viewer@flayve.com',
  'viewer',
  'TLaRNKaZr3WxLGpbrp/4RXDj6FrHCxuZOyA6qpiVUpo=',
  'flayve_viewer_salt_2025',
  'viewer',
  1,
  datetime('now'),
  datetime('now')
);

-- Saldo inicial para Viewer (R$ 100)
INSERT INTO transactions (user_id, type, amount, status, metadata, created_at)
VALUES (
  3,
  'deposit',
  100.00,
  'completed',
  '{"description":"Saldo inicial de teste","method":"manual"}',
  datetime('now')
);

-- VERIFICAÇÃO
SELECT 'Usuários criados:' as info, COUNT(*) as total FROM users;
SELECT id, email, username, role FROM users ORDER BY id;

-- ============================================
-- CREDENCIAIS DE LOGIN:
-- ============================================
-- Admin:    admin@flayve.com    / Admin@2025
-- Streamer: streamer@flayve.com / Streamer@2025
-- Viewer:   viewer@flayve.com   / Viewer@2025
-- ============================================
