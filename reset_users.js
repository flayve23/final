/**
 * ============================================
 * SCRIPT NODE.JS - RESET DE USUÁRIOS COM HASHES
 * ============================================
 * Data: 2025-12-30
 * Versão: V104
 * Desenvolvido por: IA Desenvolvimento Sênior
 * ============================================
 * 
 * Este script:
 * 1. Gera hashes de senha seguros com PBKDF2
 * 2. Cria 3 usuários de teste (admin, streamer, viewer)
 * 3. Limpa todos os dados existentes
 * 4. Insere os novos usuários com senhas seguras
 * 
 * USO:
 * node reset_users.js
 * 
 * ATENÇÃO: Este script APAGA TODOS OS DADOS!
 * Use apenas em DESENVOLVIMENTO/STAGING
 */

/**
 * Função para gerar hash de senha usando PBKDF2
 * (mesmo algoritmo usado no auth-utils.ts)
 */
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);

  // Importar senha como chave base
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derivar chave com PBKDF2
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Exportar chave e converter para base64
  const exportedKey = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(exportedKey));
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
  
  return hashBase64;
}

/**
 * Dados dos usuários de teste
 */
const testUsers = [
  {
    email: 'admin@flayve.com',
    username: 'Admin Master',
    password: 'Admin@2025',
    salt: 'flayve_admin_salt_2025',
    role: 'admin'
  },
  {
    email: 'streamer@flayve.com',
    username: 'Bella Streamer',
    password: 'Streamer@2025',
    salt: 'flayve_streamer_salt_2025',
    role: 'streamer'
  },
  {
    email: 'viewer@flayve.com',
    username: 'João Viewer',
    password: 'Viewer@2025',
    salt: 'flayve_viewer_salt_2025',
    role: 'viewer'
  }
];

/**
 * Função principal
 */
async function main() {
  console.log('🚀 FLAYVE V104 - Reset de Usuários\n');
  console.log('⚠️  ATENÇÃO: Este script vai APAGAR TODOS OS DADOS!\n');
  
  // Gerar hashes para todos os usuários
  console.log('🔐 Gerando hashes de senha...\n');
  
  for (const user of testUsers) {
    const hash = await hashPassword(user.password, user.salt);
    user.hash = hash;
    
    console.log(`✅ ${user.role.toUpperCase()}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Senha: ${user.password}`);
    console.log(`   Salt: ${user.salt}`);
    console.log(`   Hash: ${hash.substring(0, 40)}...\n`);
  }
  
  // Gerar SQL com hashes reais
  console.log('\n📝 Gerando SQL com hashes...\n');
  
  const sql = `
-- ============================================
-- SCRIPT SQL GERADO COM HASHES CORRETOS
-- ============================================
-- Gerado em: ${new Date().toISOString()}
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
  '${testUsers[0].email}',
  '${testUsers[0].username}',
  '${testUsers[0].hash}',
  '${testUsers[0].salt}',
  '${testUsers[0].role}',
  1,
  datetime('now'),
  datetime('now')
);

-- 2. STREAMER
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  '${testUsers[1].email}',
  '${testUsers[1].username}',
  '${testUsers[1].hash}',
  '${testUsers[1].salt}',
  '${testUsers[1].role}',
  1,
  datetime('now'),
  datetime('now')
);

-- Perfil do Streamer
INSERT INTO profiles (user_id, bio_name, bio_description, price_per_minute, is_online, is_public, total_earnings, average_rating, total_ratings, created_at, updated_at)
VALUES (
  2,
  'Bella 💋',
  'Streamer profissional para testes. Preço: R$ 10/min. Disponível para chamadas privadas! 🔥',
  10.00,
  0,
  1,
  0.00,
  0.00,
  0,
  datetime('now'),
  datetime('now')
);

-- 3. VIEWER
INSERT INTO users (email, username, password_hash, salt, role, email_verified, created_at, updated_at)
VALUES (
  '${testUsers[2].email}',
  '${testUsers[2].username}',
  '${testUsers[2].hash}',
  '${testUsers[2].salt}',
  '${testUsers[2].role}',
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
`;

  console.log(sql);
  
  console.log('\n✅ SCRIPT GERADO COM SUCESSO!\n');
  console.log('📋 PRÓXIMOS PASSOS:\n');
  console.log('1. Copie o SQL gerado acima');
  console.log('2. Execute no Cloudflare D1:');
  console.log('   npx wrangler d1 execute webapp-production --remote --file=reset_users_FINAL.sql\n');
  console.log('3. Ou execute via npx wrangler d1 execute webapp-production --remote --command="..."\n');
  
  console.log('\n👥 CREDENCIAIS DE TESTE:\n');
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Senha: ${user.password}\n`);
  });
  
  console.log('⚠️  IMPORTANTE: Mude as senhas após o primeiro login!\n');
  
  // Salvar SQL em arquivo
  const fs = require('fs');
  fs.writeFileSync('reset_users_FINAL.sql', sql);
  console.log('💾 SQL salvo em: reset_users_FINAL.sql\n');
}

// Executar
main().catch(console.error);
