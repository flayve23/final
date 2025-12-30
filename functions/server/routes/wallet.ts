import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  MERCADO_PAGO_ACCESS_TOKEN: string
  PUBLIC_URL?: string // RC1: URL base para notification_url
}

const wallet = new Hono<{ Bindings: Bindings }>()

wallet.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401)
  c.set('user', payload)
  await next()
})

wallet.get('/balance', async (c) => {
  const user = c.get('user') as any
  const result = await c.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN type IN ('deposit', 'call_earning', 'tip') THEN amount ELSE 0 END) -
      SUM(CASE WHEN type IN ('withdrawal', 'call_payment') THEN amount ELSE 0 END) as balance
    FROM transactions WHERE user_id = ? AND status = 'completed'
  `).bind(user.sub).first()
  return c.json({ balance: result?.balance || 0 })
})

wallet.post('/recharge', async (c) => {
  const user = c.get('user') as any
  const { amount, method } = await c.req.json()
  
  if (!amount || amount < 1) return c.json({ error: 'Valor inválido' }, 400)

  if (!c.env.MERCADO_PAGO_ACCESS_TOKEN) {
      return c.json({ error: 'Sistema de pagamento não configurado (MP Token Missing)' }, 500)
  }

  try {
    // RC1: Detectar URL base (usa PUBLIC_URL ou o origin da requisição)
    const publicUrl = c.env.PUBLIC_URL || new URL(c.req.url).origin;
    const notificationUrl = `${publicUrl}/api/webhooks/mercadopago`;
    
    console.log('🔔 RC1: Criando pagamento com notification_url:', notificationUrl);

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${c.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
            transaction_amount: Number(amount),
            description: `Recarga Flayve - User ${user.sub}`,
            payment_method_id: 'pix',
            payer: { email: user.email },
            notification_url: notificationUrl, // RC1: FIX - Webhook dinâmico
            installments: 1
        })
    });
    
    const mpData = await mpRes.json();
    
    if (!mpRes.ok) {
        console.error('❌ RC1: Mercado Pago error:', mpData);
        return c.json({ error: `MP Recused: ${mpData.message || 'Erro desconhecido'}` }, 500);
    }

    console.log('✅ RC1: Pagamento criado com sucesso! MP ID:', mpData.id);

    // Save as PENDING
    await c.env.DB.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, metadata)
        VALUES (?, 'deposit', ?, 'pending', ?)
    `).bind(user.sub, amount, JSON.stringify({ 
        mp_id: mpData.id, 
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64
    })).run();

    return c.json({ 
        success: true, 
        payment_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
        qr_code: mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        status: 'pending_payment',
        mp_id: mpData.id // RC1: Retornar ID para debug
    });

  } catch (e: any) {
    console.error('❌ RC1: Wallet recharge error:', e);
    return c.json({ error: `Server Error: ${e.message}` }, 500);
  }
})

wallet.get('/transactions', async (c) => {
  const user = c.get('user') as any
  const results = await c.env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.sub).all()
  return c.json(results.results)
})

export default wallet
