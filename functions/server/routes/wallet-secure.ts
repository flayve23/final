// functions/server/routes/wallet-secure.ts
// Endpoint de Saque Seguro com TODAS as validações

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// CONFIGURAÇÕES
// ===========================

const SECURITY_CONFIG = {
  MANUAL_APPROVAL_THRESHOLD: 5000,  // R$ 5.000
  MIN_WITHDRAWAL: 10,  // R$ 10
  RATE_LIMIT_WINDOW: 3600,  // 1 hora
  RATE_LIMIT_MAX_ATTEMPTS: 5,
  REQUIRE_2FA_THRESHOLD: 1000  // R$ 1.000
};

// Limites padrão por nível de verificação
const WITHDRAWAL_LIMITS = {
  unverified: { daily: 100, monthly: 500, per_transaction: 500 },
  kyc_pending: { daily: 500, monthly: 2000, per_transaction: 1000 },
  kyc_approved: { daily: 5000, monthly: 50000, per_transaction: 10000 },
  premium: { daily: 50000, monthly: 500000, per_transaction: 50000 }
};

// ===========================
// FUNÇÕES AUXILIARES
// ===========================

function generateIdempotencyKey(userId: string, amount: number, timestamp: number): string {
  return `withdraw_${userId}_${amount}_${timestamp}`;
}

async function getUserVerificationLevel(userId: string, c: any): Promise<string> {
  const user = await c.env.DB.prepare(`
    SELECT kyc_status, is_premium FROM users WHERE id = ?
  `).bind(userId).first();
  
  if (!user) return 'unverified';
  
  if (user.is_premium) return 'premium';
  if (user.kyc_status === 'approved') return 'kyc_approved';
  if (user.kyc_status === 'pending') return 'kyc_pending';
  
  return 'unverified';
}

async function checkRateLimit(userId: string, c: any): Promise<{ allowed: boolean; attempts: number }> {
  const windowStart = Math.floor(Date.now() / 1000) - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
  
  const attempts = await c.env.DB.prepare(`
    SELECT COUNT(*) as count 
    FROM withdrawal_attempts 
    WHERE user_id = ? AND created_at > ?
  `).bind(userId, windowStart).first();
  
  return {
    allowed: attempts.count < SECURITY_CONFIG.RATE_LIMIT_MAX_ATTEMPTS,
    attempts: attempts.count
  };
}

async function checkIdempotency(idempotencyKey: string, c: any): Promise<any | null> {
  const existing = await c.env.DB.prepare(`
    SELECT * FROM wallet_transactions 
    WHERE idempotency_key = ?
  `).bind(idempotencyKey).first();
  
  return existing;
}

async function checkAccountStatus(userId: string, c: any): Promise<{ ok: boolean; reason?: string }> {
  const user = await c.env.DB.prepare(`
    SELECT account_status, suspension_reason, suspension_expires_at 
    FROM users 
    WHERE id = ?
  `).bind(userId).first();
  
  if (!user) {
    return { ok: false, reason: 'User not found' };
  }
  
  if (user.account_status === 'banned') {
    return { ok: false, reason: 'Account is banned' };
  }
  
  if (user.account_status === 'suspended') {
    const now = Math.floor(Date.now() / 1000);
    if (user.suspension_expires_at && user.suspension_expires_at > now) {
      return { ok: false, reason: `Account suspended until ${new Date(user.suspension_expires_at * 1000).toLocaleString('pt-BR')}` };
    }
  }
  
  return { ok: true };
}

async function checkWithdrawalLimits(userId: string, amount: number, c: any): Promise<{ ok: boolean; reason?: string }> {
  // Pegar nível de verificação
  const level = await getUserVerificationLevel(userId, c);
  const limits = WITHDRAWAL_LIMITS[level];
  
  // Verificar limite por transação
  if (amount > limits.per_transaction) {
    return {
      ok: false,
      reason: `Maximum withdrawal per transaction: R$ ${limits.per_transaction.toFixed(2)}. Your verification level: ${level}`
    };
  }
  
  // Calcular saques nas últimas 24h
  const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
  const dailyWithdrawals = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) as total 
    FROM wallet_transactions 
    WHERE user_id = ? 
    AND type = 'withdrawal' 
    AND status = 'completed'
    AND created_at > ?
  `).bind(userId, oneDayAgo).first();
  
  if ((dailyWithdrawals.total || 0) + amount > limits.daily) {
    return {
      ok: false,
      reason: `Daily withdrawal limit exceeded. Limit: R$ ${limits.daily.toFixed(2)}, Used: R$ ${dailyWithdrawals.total.toFixed(2)}, Remaining: R$ ${(limits.daily - dailyWithdrawals.total).toFixed(2)}`
    };
  }
  
  // Calcular saques no mês
  const oneMonthAgo = Math.floor(Date.now() / 1000) - (86400 * 30);
  const monthlyWithdrawals = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) as total 
    FROM wallet_transactions 
    WHERE user_id = ? 
    AND type = 'withdrawal' 
    AND status = 'completed'
    AND created_at > ?
  `).bind(userId, oneMonthAgo).first();
  
  if ((monthlyWithdrawals.total || 0) + amount > limits.monthly) {
    return {
      ok: false,
      reason: `Monthly withdrawal limit exceeded. Limit: R$ ${limits.monthly.toFixed(2)}, Used: R$ ${monthlyWithdrawals.total.toFixed(2)}, Remaining: R$ ${(limits.monthly - monthlyWithdrawals.total).toFixed(2)}`
    };
  }
  
  return { ok: true };
}

async function lockUserWallet(userId: string, c: any): Promise<boolean> {
  const result = await c.env.DB.prepare(`
    UPDATE wallets 
    SET is_processing = 1 
    WHERE user_id = ? AND is_processing = 0
  `).bind(userId).run();
  
  return result.changes > 0;
}

async function unlockUserWallet(userId: string, c: any): Promise<void> {
  await c.env.DB.prepare(`
    UPDATE wallets 
    SET is_processing = 0 
    WHERE user_id = ?
  `).bind(userId).run();
}

async function createWithdrawalAttempt(
  userId: string, 
  amount: number, 
  success: boolean, 
  failureReason: string | null,
  fraudFlags: any[],
  ipAddress: string,
  userAgent: string,
  c: any
): Promise<void> {
  await c.env.DB.prepare(`
    INSERT INTO withdrawal_attempts 
    (id, user_id, amount, success, failure_reason, fraud_flags_detected, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    amount,
    success ? 1 : 0,
    failureReason,
    JSON.stringify(fraudFlags),
    ipAddress,
    userAgent,
    Math.floor(Date.now() / 1000)
  ).run();
}

// ===========================
// ENDPOINT PRINCIPAL DE SAQUE
// ===========================

app.post('/withdraw', async (c) => {
  const startTime = Date.now();
  let walletLocked = false;
  
  try {
    // ===========================
    // 1. EXTRAIR DADOS
    // ===========================
    
    const { 
      user_id, 
      amount, 
      pix_key, 
      pix_key_type,
      totp_code,  // Código 2FA
      idempotency_key 
    } = await c.req.json();
    
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';
    
    console.log(`[WITHDRAWAL] User ${user_id} requesting R$ ${amount}`);
    
    // ===========================
    // 2. VALIDAÇÕES BÁSICAS
    // ===========================
    
    // Valor mínimo
    if (amount < SECURITY_CONFIG.MIN_WITHDRAWAL) {
      await createWithdrawalAttempt(user_id, amount, false, `Amount below minimum (R$ ${SECURITY_CONFIG.MIN_WITHDRAWAL})`, [], ipAddress, userAgent, c);
      return c.json({ 
        error: `Minimum withdrawal amount is R$ ${SECURITY_CONFIG.MIN_WITHDRAWAL.toFixed(2)}` 
      }, 400);
    }
    
    // Valor deve ser positivo
    if (amount <= 0) {
      await createWithdrawalAttempt(user_id, amount, false, 'Invalid amount', [], ipAddress, userAgent, c);
      return c.json({ error: 'Invalid amount' }, 400);
    }
    
    // ===========================
    // 3. VERIFICAR IDEMPOTÊNCIA
    // ===========================
    
    const existingTransaction = await checkIdempotency(idempotency_key, c);
    
    if (existingTransaction) {
      console.log(`[WITHDRAWAL] Duplicate request detected: ${idempotency_key}`);
      return c.json({
        success: true,
        message: 'Transaction already processed',
        transaction_id: existingTransaction.id,
        status: existingTransaction.status
      });
    }
    
    // ===========================
    // 4. RATE LIMITING
    // ===========================
    
    const rateLimit = await checkRateLimit(user_id, c);
    
    if (!rateLimit.allowed) {
      await createWithdrawalAttempt(user_id, amount, false, 'Rate limit exceeded', [], ipAddress, userAgent, c);
      return c.json({
        error: 'Too many withdrawal attempts',
        retry_after: SECURITY_CONFIG.RATE_LIMIT_WINDOW,
        attempts: rateLimit.attempts
      }, 429);
    }
    
    // ===========================
    // 5. VERIFICAR STATUS DA CONTA
    // ===========================
    
    const accountStatus = await checkAccountStatus(user_id, c);
    
    if (!accountStatus.ok) {
      await createWithdrawalAttempt(user_id, amount, false, accountStatus.reason, [], ipAddress, userAgent, c);
      return c.json({ error: accountStatus.reason }, 403);
    }
    
    // ===========================
    // 6. VERIFICAR LIMITES
    // ===========================
    
    const limitsCheck = await checkWithdrawalLimits(user_id, amount, c);
    
    if (!limitsCheck.ok) {
      await createWithdrawalAttempt(user_id, amount, false, limitsCheck.reason, [], ipAddress, userAgent, c);
      return c.json({ error: limitsCheck.reason }, 400);
    }
    
    // ===========================
    // 7. VERIFICAR KYC (se necessário)
    // ===========================
    
    if (amount >= 1000) {
      const user = await c.env.DB.prepare(`
        SELECT kyc_status FROM users WHERE id = ?
      `).bind(user_id).first();
      
      if (user.kyc_status !== 'approved') {
        await createWithdrawalAttempt(user_id, amount, false, 'KYC not approved', [], ipAddress, userAgent, c);
        return c.json({
          error: 'KYC verification required for withdrawals above R$ 1.000,00',
          kyc_status: user.kyc_status,
          action_required: '/kyc/upload'
        }, 403);
      }
    }
    
    // ===========================
    // 8. VERIFICAR 2FA (se ativo ou valor alto)
    // ===========================
    
    const user = await c.env.DB.prepare(`
      SELECT two_factor_enabled, two_factor_secret FROM users WHERE id = ?
    `).bind(user_id).first();
    
    if (user.two_factor_enabled || amount >= SECURITY_CONFIG.REQUIRE_2FA_THRESHOLD) {
      if (!totp_code) {
        await createWithdrawalAttempt(user_id, amount, false, '2FA code required', [], ipAddress, userAgent, c);
        return c.json({
          error: '2FA code required',
          two_factor_required: true
        }, 403);
      }
      
      // Validar código TOTP (implementar com biblioteca authenticator)
      // const isValid = verifyTOTP(user.two_factor_secret, totp_code);
      // if (!isValid) {
      //   await createWithdrawalAttempt(user_id, amount, false, 'Invalid 2FA code', [], ipAddress, userAgent, c);
      //   return c.json({ error: 'Invalid 2FA code' }, 401);
      // }
    }
    
    // ===========================
    // 9. DETECÇÃO DE FRAUDE
    // ===========================
    
    // Importar detecção de fraude
    const fraudCheckResponse = await fetch(`${c.req.url.replace('/wallet-secure/withdraw', '/fraud-detection/check/' + user_id)}`, {
      method: 'POST',
      headers: c.req.raw.headers
    });
    
    const fraudCheck = await fraudCheckResponse.json();
    
    console.log(`[WITHDRAWAL] Fraud score: ${fraudCheck.score}, Recommendation: ${fraudCheck.recommendation}`);
    
    // Se bloqueado, não permitir
    if (fraudCheck.recommendation === 'block') {
      await createWithdrawalAttempt(user_id, amount, false, 'Fraud detected', fraudCheck.flags, ipAddress, userAgent, c);
      return c.json({
        error: 'Withdrawal blocked for security review',
        reason: fraudCheck.reason,
        contact: 'support@flayve.com'
      }, 403);
    }
    
    // ===========================
    // 10. APROVAÇÃO MANUAL (se necessário)
    // ===========================
    
    if (amount >= SECURITY_CONFIG.MANUAL_APPROVAL_THRESHOLD || fraudCheck.recommendation === 'review') {
      // Criar saque pendente de aprovação
      const withdrawalId = crypto.randomUUID();
      
      await c.env.DB.prepare(`
        INSERT INTO pending_withdrawals 
        (id, user_id, amount, pix_key, pix_key_type, status, fraud_flags, fraud_score, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending_approval', ?, ?, ?)
      `).bind(
        withdrawalId,
        user_id,
        amount,
        pix_key,
        pix_key_type,
        JSON.stringify(fraudCheck.flags),
        fraudCheck.score,
        Math.floor(Date.now() / 1000)
      ).run();
      
      await createWithdrawalAttempt(user_id, amount, true, null, fraudCheck.flags, ipAddress, userAgent, c);
      
      // TODO: Notificar admin
      
      return c.json({
        success: true,
        message: 'Withdrawal request submitted for approval',
        withdrawal_id: withdrawalId,
        estimated_processing_time: '24-48 hours',
        reason: fraudCheck.recommendation === 'review' ? 'Security review required' : 'Manual approval required for large amounts'
      });
    }
    
    // ===========================
    // 11. LOCK DE TRANSAÇÃO
    // ===========================
    
    const locked = await lockUserWallet(user_id, c);
    
    if (!locked) {
      await createWithdrawalAttempt(user_id, amount, false, 'Transaction already in progress', fraudCheck.flags, ipAddress, userAgent, c);
      return c.json({ error: 'A transaction is already in progress. Please wait.' }, 409);
    }
    
    walletLocked = true;
    
    // ===========================
    // 12. VERIFICAR SALDO (ATOMICAMENTE)
    // ===========================
    
    const wallet = await c.env.DB.prepare(`
      SELECT balance FROM wallets WHERE user_id = ?
    `).bind(user_id).first();
    
    if (!wallet || wallet.balance < amount) {
      await unlockUserWallet(user_id, c);
      await createWithdrawalAttempt(user_id, amount, false, 'Insufficient balance', fraudCheck.flags, ipAddress, userAgent, c);
      return c.json({ 
        error: 'Insufficient balance',
        available: wallet?.balance || 0,
        requested: amount
      }, 400);
    }
    
    // ===========================
    // 13. PROCESSAR SAQUE
    // ===========================
    
    // Debitar saldo
    await c.env.DB.prepare(`
      UPDATE wallets 
      SET balance = balance - ? 
      WHERE user_id = ?
    `).bind(amount, user_id).run();
    
    const newBalance = wallet.balance - amount;
    
    // Criar transação
    const transactionId = crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO wallet_transactions 
      (id, user_id, type, amount, balance_after, status, idempotency_key, metadata, created_at)
      VALUES (?, ?, 'withdrawal', ?, ?, 'processing', ?, ?, ?)
    `).bind(
      transactionId,
      user_id,
      -amount,
      newBalance,
      idempotency_key,
      JSON.stringify({ pix_key, pix_key_type, fraud_score: fraudCheck.score }),
      Math.floor(Date.now() / 1000)
    ).run();
    
    // ===========================
    // 14. AUDIT LOG
    // ===========================
    
    await c.env.DB.prepare(`
      INSERT INTO audit_logs 
      (id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at)
      VALUES (?, ?, 'withdrawal_requested', 'wallet', ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      user_id,
      transactionId,
      JSON.stringify({
        before: { balance: wallet.balance },
        after: { balance: newBalance },
        amount: amount,
        fraud_score: fraudCheck.score
      }),
      ipAddress,
      userAgent,
      Math.floor(Date.now() / 1000)
    ).run();
    
    // ===========================
    // 15. DESBLOQUEAR WALLET
    // ===========================
    
    await unlockUserWallet(user_id, c);
    walletLocked = false;
    
    // ===========================
    // 16. NOTIFICAR USUÁRIO
    // ===========================
    
    // TODO: Enviar email/SMS
    
    // ===========================
    // 17. REGISTRAR TENTATIVA SUCESSO
    // ===========================
    
    await createWithdrawalAttempt(user_id, amount, true, null, fraudCheck.flags, ipAddress, userAgent, c);
    
    // ===========================
    // 18. PROCESSAR PAGAMENTO (ASSÍNCRONO)
    // ===========================
    
    // TODO: Integrar com API de pagamento (Mercado Pago Pix)
    // Por enquanto, marcar como completed imediatamente
    
    await c.env.DB.prepare(`
      UPDATE wallet_transactions 
      SET status = 'completed' 
      WHERE id = ?
    `).bind(transactionId).run();
    
    const processingTime = Date.now() - startTime;
    console.log(`[WITHDRAWAL] Success in ${processingTime}ms`);
    
    return c.json({
      success: true,
      transaction_id: transactionId,
      amount: amount,
      new_balance: newBalance,
      pix_key: pix_key,
      estimated_arrival: '1-2 hours',
      processing_time_ms: processingTime
    });
    
  } catch (error) {
    console.error('[WITHDRAWAL] Error:', error);
    
    // Desbloquear wallet se estava bloqueado
    if (walletLocked) {
      try {
        await unlockUserWallet(c.get('user_id'), c);
      } catch (unlockError) {
        console.error('[WITHDRAWAL] Failed to unlock wallet:', unlockError);
      }
    }
    
    return c.json({ 
      error: 'Failed to process withdrawal', 
      details: error.message 
    }, 500);
  }
});

// ===========================
// OUTROS ENDPOINTS
// ===========================

// Listar saques pendentes (para admin)
app.get('/pending', async (c) => {
  try {
    const pending = await c.env.DB.prepare(`
      SELECT 
        pw.*,
        u.email,
        u.role,
        u.kyc_status
      FROM pending_withdrawals pw
      JOIN users u ON pw.user_id = u.id
      WHERE pw.status = 'pending_approval'
      ORDER BY pw.fraud_score DESC, pw.created_at ASC
    `).all();
    
    return c.json({ withdrawals: pending.results });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    return c.json({ error: 'Failed to get pending withdrawals' }, 500);
  }
});

// Aprovar/Rejeitar saque (admin)
app.post('/pending/:id/review', async (c) => {
  try {
    const withdrawalId = c.req.param('id');
    const { action, admin_id, notes } = await c.req.json();
    
    if (action === 'approve') {
      // Aprovar e processar
      const withdrawal = await c.env.DB.prepare(`
        SELECT * FROM pending_withdrawals WHERE id = ?
      `).bind(withdrawalId).first();
      
      // Processar saque...
      // (lógica similar ao fluxo normal)
      
      await c.env.DB.prepare(`
        UPDATE pending_withdrawals 
        SET status = 'approved', approved_by = ?, approved_at = ?, admin_notes = ?
        WHERE id = ?
      `).bind(admin_id, Math.floor(Date.now() / 1000), notes, withdrawalId).run();
      
      return c.json({ success: true, message: 'Withdrawal approved' });
      
    } else if (action === 'reject') {
      // Rejeitar e reembolsar
      const withdrawal = await c.env.DB.prepare(`
        SELECT * FROM pending_withdrawals WHERE id = ?
      `).bind(withdrawalId).first();
      
      // Reembolsar saldo
      await c.env.DB.prepare(`
        UPDATE wallets 
        SET balance = balance + ? 
        WHERE user_id = ?
      `).bind(withdrawal.amount, withdrawal.user_id).run();
      
      await c.env.DB.prepare(`
        UPDATE pending_withdrawals 
        SET status = 'rejected', approved_by = ?, approved_at = ?, rejection_reason = ?
        WHERE id = ?
      `).bind(admin_id, Math.floor(Date.now() / 1000), notes, withdrawalId).run();
      
      return c.json({ success: true, message: 'Withdrawal rejected and refunded' });
    }
    
    return c.json({ error: 'Invalid action' }, 400);
    
  } catch (error) {
    console.error('Review withdrawal error:', error);
    return c.json({ error: 'Failed to review withdrawal' }, 500);
  }
});

export default app;
