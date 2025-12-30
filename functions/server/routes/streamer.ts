import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
}

const streamer = new Hono<{ Bindings: Bindings }>()

// Middleware
streamer.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  
  const token = authHeader.split(' ')[1]
  const payload = await verifySessionToken(token)
  
  if (!payload || payload.role !== 'streamer') return c.json({ error: 'Unauthorized: Streamers only' }, 403)
  
  c.set('user', payload)
  await next()
})

// GET /api/streamer/earnings - Resumo + Ledger
streamer.get('/earnings', async (c) => {
  const user = c.get('user') as any
  
  // 1. Saldos
  const balanceQuery = `
    SELECT 
      SUM(CASE WHEN type IN ('call_earning', 'tip', 'referral') THEN amount ELSE 0 END) -
      SUM(CASE WHEN type IN ('withdrawal', 'penalty', 'platform_fee', 'refund') THEN amount ELSE 0 END) as available_balance,
      SUM(CASE WHEN type IN ('call_earning', 'tip', 'referral') THEN amount ELSE 0 END) as total_lifetime_earnings
    FROM transactions
    WHERE user_id = ? AND status = 'completed'
  `
  const balanceResult = await c.env.DB.prepare(balanceQuery).bind(user.sub).first()
  
  // 2. Ledger (Extrato Detalhado) - Últimas 50 transações
  const transactions = await c.env.DB.prepare(`
    SELECT id, type, amount, status, created_at, metadata 
    FROM transactions 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).bind(user.sub).all()

  // 3. Histórico de Saques (apenas saques)
  const withdrawals = await c.env.DB.prepare(`
    SELECT * FROM transactions WHERE user_id = ? AND type = 'withdrawal' ORDER BY created_at DESC LIMIT 5
  `).bind(user.sub).all()

  return c.json({
    available_balance: balanceResult?.available_balance || 0,
    total_lifetime_earnings: balanceResult?.total_lifetime_earnings || 0,
    ledger: transactions.results,
    withdrawals: withdrawals.results
  })
})

// POST /api/streamer/withdraw - Solicitar Saque
streamer.post('/withdraw', async (c) => {
  const user = c.get('user') as any
  const { amount, pix_key } = await c.req.json()
  
  // Verificação de Saldo Real (Replicando a lógica de saldo)
  const balanceQuery = `
    SELECT 
      SUM(CASE WHEN type IN ('call_earning', 'tip', 'referral') THEN amount ELSE 0 END) -
      SUM(CASE WHEN type IN ('withdrawal', 'penalty', 'platform_fee', 'refund') THEN amount ELSE 0 END) as balance
    FROM transactions
    WHERE user_id = ? AND status = 'completed'
  `
  const { balance } = await c.env.DB.prepare(balanceQuery).bind(user.sub).first() as any
  
  if (balance < amount) return c.json({ error: 'Saldo insuficiente' }, 400)
  if (amount < 50) return c.json({ error: 'Saque mínimo R$ 50,00' }, 400)

  try {
    await c.env.DB.prepare(`
      INSERT INTO transactions (user_id, type, amount, status, metadata)
      VALUES (?, 'withdrawal', ?, 'pending', ?)
    `).bind(user.sub, amount, JSON.stringify({ pix_key, requested_at: Date.now() })).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

export default streamer
