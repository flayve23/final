// functions/server/routes/fraud-detection.ts
// Sistema de Detecção de Fraudes - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// TIPOS
// ===========================

interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata?: any;
}

interface FraudCheckResult {
  flags: FraudFlag[];
  score: number;  // 0-100
  recommendation: 'allow' | 'review' | 'block';
  reason?: string;
}

// ===========================
// CONFIGURAÇÕES
// ===========================

const FRAUD_CONFIG = {
  // Limites para detecção
  NEW_ACCOUNT_DAYS: 7,
  HIGH_DEPOSIT_THRESHOLD: 1000,
  IMMEDIATE_WITHDRAWAL_HOURS: 1,
  RAPID_TRANSACTIONS_COUNT: 5,
  RAPID_TRANSACTIONS_WINDOW: 60, // segundos
  MAX_FAILED_KYC: 3,
  
  // Scores de severidade
  SEVERITY_SCORES: {
    low: 10,
    medium: 25,
    high: 50,
    critical: 100
  },
  
  // Thresholds de ação
  BLOCK_THRESHOLD: 75,
  REVIEW_THRESHOLD: 40
};

// ===========================
// FUNÇÕES DE DETECÇÃO
// ===========================

async function checkNewAccountHighDeposit(userId: string, c: any): Promise<FraudFlag | null> {
  // Verificar idade da conta
  const user = await c.env.DB.prepare(
    'SELECT created_at FROM users WHERE id = ?'
  ).bind(userId).first();
  
  if (!user) return null;
  
  const accountAge = Math.floor(Date.now() / 1000) - user.created_at;
  const isNewAccount = accountAge < (FRAUD_CONFIG.NEW_ACCOUNT_DAYS * 86400);
  
  if (!isNewAccount) return null;
  
  // Verificar valor depositado
  const deposits = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM wallet_transactions 
    WHERE user_id = ? AND type = 'deposit'
  `).bind(userId).first();
  
  if (deposits.total >= FRAUD_CONFIG.HIGH_DEPOSIT_THRESHOLD) {
    return {
      type: 'new_account_high_deposit',
      severity: 'high',
      description: `New account (${Math.floor(accountAge / 86400)} days) with R$ ${deposits.total.toFixed(2)} deposited`,
      metadata: {
        account_age_days: Math.floor(accountAge / 86400),
        total_deposited: deposits.total
      }
    };
  }
  
  return null;
}

async function checkImmediateWithdrawal(userId: string, c: any): Promise<FraudFlag | null> {
  // Pegar último depósito
  const lastDeposit = await c.env.DB.prepare(`
    SELECT created_at, amount 
    FROM wallet_transactions 
    WHERE user_id = ? AND type = 'deposit' 
    ORDER BY created_at DESC 
    LIMIT 1
  `).bind(userId).first();
  
  if (!lastDeposit) return null;
  
  const timeSinceDeposit = Math.floor(Date.now() / 1000) - lastDeposit.created_at;
  const hoursThreshold = FRAUD_CONFIG.IMMEDIATE_WITHDRAWAL_HOURS * 3600;
  
  if (timeSinceDeposit < hoursThreshold) {
    return {
      type: 'immediate_withdrawal',
      severity: 'critical',
      description: `Withdrawal requested ${Math.floor(timeSinceDeposit / 60)} minutes after deposit of R$ ${lastDeposit.amount.toFixed(2)}`,
      metadata: {
        minutes_since_deposit: Math.floor(timeSinceDeposit / 60),
        deposit_amount: lastDeposit.amount
      }
    };
  }
  
  return null;
}

async function checkMultipleFailedKYC(userId: string, c: any): Promise<FraudFlag | null> {
  const rejectedKyc = await c.env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM kyc_documents 
    WHERE user_id = ? AND status = 'rejected'
  `).bind(userId).first();
  
  if (rejectedKyc.count >= FRAUD_CONFIG.MAX_FAILED_KYC) {
    return {
      type: 'multiple_failed_kyc',
      severity: 'high',
      description: `${rejectedKyc.count} KYC rejections`,
      metadata: {
        rejection_count: rejectedKyc.count
      }
    };
  }
  
  return null;
}

async function checkChargebackHistory(userId: string, c: any): Promise<FraudFlag | null> {
  const chargebacks = await c.env.DB.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
    FROM chargebacks 
    WHERE user_id = ?
  `).bind(userId).first();
  
  if (chargebacks.count > 0) {
    const severity = chargebacks.count >= 3 ? 'critical' : chargebacks.count >= 2 ? 'high' : 'medium';
    
    return {
      type: 'chargeback_history',
      severity: severity,
      description: `${chargebacks.count} chargebacks totaling R$ ${chargebacks.total_amount.toFixed(2)}`,
      metadata: {
        chargeback_count: chargebacks.count,
        total_amount: chargebacks.total_amount
      }
    };
  }
  
  return null;
}

async function checkRapidTransactions(userId: string, c: any): Promise<FraudFlag | null> {
  const recentTransactions = await c.env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM wallet_transactions 
    WHERE user_id = ? 
    AND created_at > ?
  `).bind(userId, Math.floor(Date.now() / 1000) - FRAUD_CONFIG.RAPID_TRANSACTIONS_WINDOW).first();
  
  if (recentTransactions.count >= FRAUD_CONFIG.RAPID_TRANSACTIONS_COUNT) {
    return {
      type: 'rapid_transactions',
      severity: 'medium',
      description: `${recentTransactions.count} transactions in ${FRAUD_CONFIG.RAPID_TRANSACTIONS_WINDOW} seconds`,
      metadata: {
        transaction_count: recentTransactions.count,
        window_seconds: FRAUD_CONFIG.RAPID_TRANSACTIONS_WINDOW
      }
    };
  }
  
  return null;
}

async function checkSuspiciousPattern(userId: string, c: any): Promise<FraudFlag | null> {
  // Padrão: Recarga alta + Sem chamadas + Saque imediato
  const user = await c.env.DB.prepare(
    'SELECT created_at FROM users WHERE id = ?'
  ).bind(userId).first();
  
  const accountAge = Math.floor(Date.now() / 1000) - user.created_at;
  
  // Conta com menos de 3 dias
  if (accountAge < 259200) {
    // Pegar depósitos
    const deposits = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM wallet_transactions 
      WHERE user_id = ? AND type = 'deposit'
    `).bind(userId).first();
    
    // Pegar chamadas
    const calls = await c.env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM calls 
      WHERE viewer_id = ? AND status = 'completed'
    `).bind(userId).first();
    
    // Depósito alto + Sem chamadas = Suspeito
    if (deposits.total > 500 && calls.count === 0) {
      return {
        type: 'suspicious_pattern',
        severity: 'high',
        description: `New account with R$ ${deposits.total.toFixed(2)} deposited but no calls completed`,
        metadata: {
          account_age_hours: Math.floor(accountAge / 3600),
          deposits: deposits.total,
          calls_completed: calls.count
        }
      };
    }
  }
  
  return null;
}

async function checkPreviousFraudFlags(userId: string, c: any): Promise<FraudFlag | null> {
  const previousFlags = await c.env.DB.prepare(`
    SELECT COUNT(*) as count, MAX(severity) as max_severity
    FROM fraud_flags 
    WHERE user_id = ? 
    AND created_at > ?
    AND reviewed = 0
  `).bind(userId, Math.floor(Date.now() / 1000) - (86400 * 30)).first(); // Últimos 30 dias
  
  if (previousFlags.count > 0) {
    return {
      type: 'previous_fraud_flags',
      severity: previousFlags.max_severity as any || 'medium',
      description: `${previousFlags.count} unreviewed fraud flags in last 30 days`,
      metadata: {
        flag_count: previousFlags.count,
        max_severity: previousFlags.max_severity
      }
    };
  }
  
  return null;
}

// ===========================
// FUNÇÃO PRINCIPAL DE VERIFICAÇÃO
// ===========================

async function performFraudCheck(userId: string, c: any): Promise<FraudCheckResult> {
  const flags: FraudFlag[] = [];
  
  // Executar todas as verificações
  const checks = [
    checkNewAccountHighDeposit(userId, c),
    checkImmediateWithdrawal(userId, c),
    checkMultipleFailedKYC(userId, c),
    checkChargebackHistory(userId, c),
    checkRapidTransactions(userId, c),
    checkSuspiciousPattern(userId, c),
    checkPreviousFraudFlags(userId, c)
  ];
  
  const results = await Promise.all(checks);
  
  // Coletar flags
  for (const result of results) {
    if (result) {
      flags.push(result);
    }
  }
  
  // Calcular score
  let score = 0;
  for (const flag of flags) {
    score += FRAUD_CONFIG.SEVERITY_SCORES[flag.severity];
  }
  
  // Limitar a 100
  score = Math.min(score, 100);
  
  // Determinar recomendação
  let recommendation: 'allow' | 'review' | 'block' = 'allow';
  let reason = '';
  
  if (score >= FRAUD_CONFIG.BLOCK_THRESHOLD) {
    recommendation = 'block';
    reason = 'High fraud risk detected. Manual review required before processing.';
  } else if (score >= FRAUD_CONFIG.REVIEW_THRESHOLD) {
    recommendation = 'review';
    reason = 'Moderate fraud risk detected. Transaction will be reviewed by admin.';
  }
  
  return {
    flags,
    score,
    recommendation,
    reason
  };
}

// ===========================
// SALVAR FLAGS NO BANCO
// ===========================

async function saveFraudFlags(userId: string, flags: FraudFlag[], c: any): Promise<void> {
  for (const flag of flags) {
    await c.env.DB.prepare(`
      INSERT INTO fraud_flags 
      (id, user_id, flag_type, severity, description, metadata, auto_generated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      flag.type,
      flag.severity,
      flag.description,
      JSON.stringify(flag.metadata || {}),
      Math.floor(Date.now() / 1000)
    ).run();
  }
}

// ===========================
// ATUALIZAR RISK SCORE DO USUÁRIO
// ===========================

async function updateUserRiskScore(userId: string, score: number, c: any): Promise<void> {
  await c.env.DB.prepare(`
    UPDATE users 
    SET risk_score = ?, last_risk_assessment = ?
    WHERE id = ?
  `).bind(score, Math.floor(Date.now() / 1000), userId).run();
}

// ===========================
// ROTAS
// ===========================

// Verificar fraude para um usuário
app.post('/check/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Realizar verificação
    const result = await performFraudCheck(userId, c);
    
    // Salvar flags se houver
    if (result.flags.length > 0) {
      await saveFraudFlags(userId, result.flags, c);
      await updateUserRiskScore(userId, result.score, c);
    }
    
    return c.json(result);
  } catch (error) {
    console.error('Fraud check error:', error);
    return c.json({ error: 'Failed to perform fraud check' }, 500);
  }
});

// Listar flags de um usuário
app.get('/flags/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    const flags = await c.env.DB.prepare(`
      SELECT * FROM fraud_flags 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all();
    
    return c.json({ flags: flags.results });
  } catch (error) {
    console.error('Get flags error:', error);
    return c.json({ error: 'Failed to get flags' }, 500);
  }
});

// Marcar flag como revisado
app.post('/flags/:flagId/review', async (c) => {
  try {
    const flagId = c.req.param('flagId');
    const { reviewed_by, notes } = await c.req.json();
    
    await c.env.DB.prepare(`
      UPDATE fraud_flags 
      SET reviewed = 1, reviewed_by = ?, reviewed_at = ?
      WHERE id = ?
    `).bind(reviewed_by, Math.floor(Date.now() / 1000), flagId).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Review flag error:', error);
    return c.json({ error: 'Failed to review flag' }, 500);
  }
});

// Dashboard de fraudes (para admin)
app.get('/dashboard', async (c) => {
  try {
    // Estatísticas gerais
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_flags,
        SUM(CASE WHEN reviewed = 0 THEN 1 ELSE 0 END) as pending_review,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_flags,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_flags
      FROM fraud_flags
      WHERE created_at > ?
    `).bind(Math.floor(Date.now() / 1000) - (86400 * 30)).first(); // Últimos 30 dias
    
    // Flags recentes
    const recentFlags = await c.env.DB.prepare(`
      SELECT f.*, u.email, u.role
      FROM fraud_flags f
      JOIN users u ON f.user_id = u.id
      WHERE f.reviewed = 0
      ORDER BY 
        CASE f.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        f.created_at DESC
      LIMIT 50
    `).all();
    
    // Usuários de alto risco
    const highRiskUsers = await c.env.DB.prepare(`
      SELECT id, email, role, risk_score, last_risk_assessment
      FROM users
      WHERE risk_score >= ?
      ORDER BY risk_score DESC
      LIMIT 20
    `).bind(FRAUD_CONFIG.REVIEW_THRESHOLD).all();
    
    return c.json({
      stats,
      recent_flags: recentFlags.results,
      high_risk_users: highRiskUsers.results
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Failed to load dashboard' }, 500);
  }
});

// ===========================
// EXPORTAR
// ===========================

export default app;
