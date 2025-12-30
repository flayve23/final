-- ============================================
-- SCRIPT DE RESET DE USUÁRIOS - FLAYVE V104
-- ============================================
-- Data: 2025-12-30
-- Versão: V104
-- Desenvolvido por: IA Desenvolvimento Sênior
-- ============================================

-- ATENÇÃO: Este script APAGA TODOS OS DADOS!
-- Use apenas em DESENVOLVIMENTO/STAGING
-- NÃO USAR EM PRODUÇÃO COM DADOS REAIS

-- ============================================
-- PASSO 1: LIMPAR TODAS AS TABELAS
-- ============================================

-- Limpar transações
DELETE FROM transactions;

-- Limpar solicitações de chamadas
DELETE FROM call_requests;

-- Limpar chamadas
DELETE FROM calls;

-- Limpar stories
DELETE FROM stories;

-- Limpar favoritos
DELETE FROM favorites;

-- Limpar referrals
DELETE FROM referrals;

-- Limpar KYC
DELETE FROM kyc_verifications;

-- Limpar perfis (cascata vai deletar profiles)
DELETE FROM profiles;

-- Limpar usuários (por último)
DELETE FROM users;

-- ============================================
-- PASSO 2: RESET AUTO INCREMENT
-- ============================================

DELETE FROM sqlite_sequence WHERE name IN (
  'users', 
  'profiles', 
  'calls', 
  'call_requests',
  'transactions', 
  'stories', 
  'favorites',
  'referrals',
  'kyc_verifications'
);

-- ============================================
-- PASSO 3: CRIAR USUÁRIOS DE TESTE
-- ============================================

-- IMPORTANTE: As senhas abaixo são TEMPORÁRIAS
-- Você deve mudá-las após o primeiro login

-- ----------------------
-- ADMIN USER
-- ----------------------
-- Email: admin@flayve.com
-- Senha: Admin@2025
-- Salt: flayve_admin_salt_2025
-- Hash: Calculado com PBKDF2(senha + salt)

INSERT INTO users (
  email, 
  username, 
  password_hash, 
  salt,
  role, 
  email_verified,
  created_at,
  updated_at
) VALUES (
  'admin@flayve.com',
  'Admin Master',
  'PLACEHOLDER_ADMIN_HASH',  -- Será substituído pelo script Node.js
  'flayve_admin_salt_2025',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

-- ----------------------
-- STREAMER USER
-- ----------------------
-- Email: streamer@flayve.com
-- Senha: Streamer@2025
-- Salt: flayve_streamer_salt_2025

INSERT INTO users (
  email, 
  username, 
  password_hash,
  salt, 
  role, 
  email_verified,
  created_at,
  updated_at
) VALUES (
  'streamer@flayve.com',
  'Bella Streamer',
  'PLACEHOLDER_STREAMER_HASH',  -- Será substituído pelo script Node.js
  'flayve_streamer_salt_2025',
  'streamer',
  1,
  datetime('now'),
  datetime('now')
);

-- Criar perfil para o streamer
INSERT INTO profiles (
  user_id,
  bio_name,
  bio_description,
  photo_url,
  price_per_minute,
  is_online,
  is_public,
  total_earnings,
  average_rating,
  total_ratings,
  created_at,
  updated_at
) VALUES (
  2,  -- ID do streamer (segundo usuário inserido)
  'Bella 💋',
  'Streamer profissional para testes. Preço: R$ 10/min. Disponível para chamadas privadas! 🔥',
  NULL,  -- Foto será adicionada depois via upload
  10.00,
  0,
  1,  -- Visível publicamente
  0.00,
  0.00,
  0,
  datetime('now'),
  datetime('now')
);

-- ----------------------
-- VIEWER USER
-- ----------------------
-- Email: viewer@flayve.com
-- Senha: Viewer@2025
-- Salt: flayve_viewer_salt_2025

INSERT INTO users (
  email, 
  username, 
  password_hash,
  salt, 
  role, 
  email_verified,
  created_at,
  updated_at
) VALUES (
  'viewer@flayve.com',
  'João Viewer',
  'PLACEHOLDER_VIEWER_HASH',  -- Será substituído pelo script Node.js
  'flayve_viewer_salt_2025',
  'viewer',
  1,
  datetime('now'),
  datetime('now')
);

-- Adicionar saldo inicial de R$ 100 para o viewer testar
INSERT INTO transactions (
  user_id,
  type,
  amount,
  status,
  metadata,
  created_at
) VALUES (
  3,  -- ID do viewer
  'deposit',
  100.00,
  'completed',
  '{"description":"Saldo inicial de teste","method":"manual"}',
  datetime('now')
);

-- ============================================
-- PASSO 4: VERIFICAÇÃO
-- ============================================

-- Contar usuários criados (deve retornar 3)
SELECT 'Total de usuários criados:' as check_name, COUNT(*) as count FROM users;

-- Listar usuários criados
SELECT 
  id,
  email,
  username,
  role,
  email_verified,
  created_at
FROM users
ORDER BY id;

-- Verificar perfil do streamer
SELECT 
  p.*,
  u.username,
  u.email
FROM profiles p
JOIN users u ON p.user_id = u.id;

-- Verificar saldo do viewer
SELECT 
  u.username,
  u.email,
  SUM(CASE WHEN t.type IN ('deposit', 'call_earning', 'tip') THEN t.amount ELSE -t.amount END) as balance
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
WHERE u.role = 'viewer'
GROUP BY u.id;

-- ============================================
-- RESUMO
-- ============================================

-- Usuários criados:
-- 1. admin@flayve.com (Admin Master) - Senha: Admin@2025
-- 2. streamer@flayve.com (Bella Streamer) - Senha: Streamer@2025
-- 3. viewer@flayve.com (João Viewer) - Senha: Viewer@2025 (R$ 100 de saldo)

-- IMPORTANTE:
-- 1. As senhas dos usuários estão com PLACEHOLDER
-- 2. Execute o script Node.js reset_users.js para gerar os hashes corretos
-- 3. Mude as senhas após o primeiro login
-- 4. Este script é apenas para DESENVOLVIMENTO/STAGING

-- ============================================
-- FIM DO SCRIPT
-- ============================================
