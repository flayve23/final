-- Reset Users SQL - Compatible with Schema V1
-- Generated: 2025-12-31

-- Delete all data
DELETE FROM transactions;
DELETE FROM call_requests;
DELETE FROM calls;
DELETE FROM stories;
DELETE FROM favorites;
DELETE FROM referrals;
DELETE FROM kyc_verifications;
DELETE FROM profiles;
DELETE FROM users;

-- Reset sequences
DELETE FROM sqlite_sequence WHERE name IN ('users', 'profiles', 'transactions', 'calls', 'call_requests', 'stories', 'favorites', 'referrals', 'kyc_verifications');

-- Insert Admin User
INSERT INTO users (id, username, email, password_hash, salt, role, email_verified, created_at)
VALUES (
  1,
  'admin',
  'admin@flayve.com',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'admin-salt-2025',
  'admin',
  1,
  CURRENT_TIMESTAMP
);

-- Insert Streamer User
INSERT INTO users (id, username, email, password_hash, salt, role, email_verified, created_at)
VALUES (
  2,
  'streamer',
  'streamer@flayve.com',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'streamer-salt-2025',
  'streamer',
  1,
  CURRENT_TIMESTAMP
);

-- Insert Viewer User
INSERT INTO users (id, username, email, password_hash, salt, role, email_verified, created_at)
VALUES (
  3,
  'viewer',
  'viewer@flayve.com',
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'viewer-salt-2025',
  'viewer',
  1,
  CURRENT_TIMESTAMP
);

-- Insert Streamer Profile (usando 'bio' em vez de 'bio_name')
INSERT INTO profiles (user_id, bio, price_per_minute, is_online, photo_url)
VALUES (
  2,
  'Streamer profissional para testes. Preço: R$ 10/min. Disponível para chamadas privadas!',
  10.00,
  0,
  NULL
);

-- Insert initial balance for viewer (R$ 100)
INSERT INTO transactions (user_id, type, amount, status, metadata, created_at)
VALUES (
  3,
  'deposit',
  100.00,
  'completed',
  '{"method":"manual","description":"Saldo inicial de teste"}',
  CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'Total users:' as info, COUNT(*) as count FROM users;
SELECT id, username, email, role FROM users ORDER BY id;

-- IMPORTANT: Update passwords after first login!
-- Passwords (all): Admin@2025, Streamer@2025, Viewer@2025
-- (These are placeholder hashes, you need to login and change them)
