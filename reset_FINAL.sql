-- ============================================
-- RESET USERS - HASHES CORRETOS
-- ============================================
-- Senhas: Admin@2025, Streamer@2025, Viewer@2025
-- Algoritmo: SHA-256 (compatível com auth-utils.ts)
-- ============================================

-- LIMPAR DADOS
DELETE FROM transactions;
DELETE FROM call_requests;
DELETE FROM calls;
DELETE FROM stories;
DELETE FROM favorites;
DELETE FROM referrals;
DELETE FROM kyc_verifications;
DELETE FROM profiles;
DELETE FROM users;

DELETE FROM sqlite_sequence WHERE name IN (
  'users', 'profiles', 'calls', 'call_requests',
  'transactions', 'stories', 'favorites', 'referrals', 'kyc_verifications'
);

-- 1. ADMIN (admin@flayve.com / Admin@2025)
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'admin@flayve.com',
  'admin',
  'ygRC9Rg5X7lZ5/PMxgHGYc5ShwLg8LeZobV3x35lPH8=',
  'admin_salt_2025',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- 2. STREAMER (streamer@flayve.com / Streamer@2025)
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'streamer@flayve.com',
  'streamer',
  '8n0vRIL+IpHH+X0bJPyxS9PTSfiG+W7p2mGSaGSKN4w=',
  'streamer_salt_2025',
  'streamer',
  1,
  datetime('now'),
  datetime('now')
);

-- Profile Streamer
INSERT INTO profiles (user_id, bio, price_per_minute, is_online, total_earnings, average_rating, total_ratings, created_at, updated_at)
VALUES (
  2,
  'Streamer profissional. R$ 10/min',
  10.00,
  0,
  0.00,
  0.00,
  0,
  datetime('now'),
  datetime('now')
);

-- 3. VIEWER (viewer@flayve.com / Viewer@2025)
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  'viewer@flayve.com',
  'viewer',
  'OOiADjxQlA46fLY3AV1SNkwgT/6pDeJL+NJlbre9aeE=',
  'viewer_salt_2025',
  'viewer',
  1,
  datetime('now'),
  datetime('now')
);

-- Saldo inicial Viewer (R$ 100)
INSERT INTO transactions (user_id, type, amount, status, metadata, created_at)
VALUES (
  3,
  'deposit',
  100.00,
  'completed',
  '{"description":"Saldo inicial","method":"manual"}',
  datetime('now')
);

-- Verificação
SELECT 'Total:' as info, COUNT(*) as count FROM users;
SELECT id, email, username, role FROM users ORDER BY id;
