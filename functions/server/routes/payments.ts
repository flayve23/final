import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const payments = new Hono<{ Bindings: Bindings }>()

// Middleware: Admin ou Streamer (para ver seus próprios pagamentos)
payments.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload) {
    return c.json({ error: 'Invalid token' }, 403)
  }
  
  c.set('user', payload)
  await next()
})

// V104 SPRINT 2: Listar pagamentos agendados (Admin vê todos, Streamer vê os seus)
payments.get('/scheduled', async (c) => {
  try {
    const user = c.get('user')
    
    let query = `
      SELECT 
        sp.*,
        u.username as streamer_username,
        u.email as streamer_email
      FROM scheduled_payments sp
      JOIN users u ON sp.streamer_id = u.id
    `
    
    const params: any[] = []
    
    // Se não for admin, filtrar apenas os pagamentos do próprio streamer
    if (user.role !== 'admin') {
      query += ' WHERE sp.streamer_id = ?'
      params.push(user.sub)
    }
    
    query += ' ORDER BY sp.due_date DESC, sp.created_at DESC LIMIT 100'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ payments: results })
    
  } catch (e: any) {
    console.error('❌ Scheduled payments list error:', e)
    return c.json({ error: `Failed to list payments: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Ver ganhos pendentes do streamer (não pagos ainda)
payments.get('/pending-earnings', async (c) => {
  try {
    const user = c.get('user')
    
    const earnings = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total_pending,
        COUNT(*) as transaction_count,
        MIN(created_at) as oldest_transaction
      FROM transactions
      WHERE user_id = ?
        AND type = 'call_earning'
        AND paid = 0
    `).bind(user.sub).first()
    
    // Calcular quando será o próximo pagamento (30 dias após a transação mais antiga)
    let next_payment_date = null
    if (earnings && earnings.oldest_transaction) {
      const oldestDate = new Date(earnings.oldest_transaction)
      oldestDate.setDate(oldestDate.getDate() + 30)
      next_payment_date = oldestDate.toISOString().split('T')[0]
    }
    
    return c.json({
      total_pending: earnings?.total_pending || 0,
      transaction_count: earnings?.transaction_count || 0,
      oldest_transaction: earnings?.oldest_transaction,
      next_payment_date
    })
    
  } catch (e: any) {
    console.error('❌ Pending earnings error:', e)
    return c.json({ error: `Failed to get earnings: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Stats de pagamentos (Admin only)
payments.get('/stats', async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    // Total pago
    const totalPaid = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total,
        COUNT(*) as count
      FROM scheduled_payments
      WHERE status = 'paid'
    `).first()
    
    // Total pendente
    const totalPending = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total,
        COUNT(*) as count
      FROM scheduled_payments
      WHERE status = 'pending'
    `).first()
    
    // Próximos pagamentos (próximos 7 dias)
    const { results: upcoming } = await c.env.DB.prepare(`
      SELECT 
        sp.*,
        u.username as streamer_username
      FROM scheduled_payments sp
      JOIN users u ON sp.streamer_id = u.id
      WHERE sp.status = 'pending'
        AND sp.due_date <= date('now', '+7 days')
      ORDER BY sp.due_date ASC
      LIMIT 10
    `).all()
    
    return c.json({
      total_paid: totalPaid,
      total_pending: totalPending,
      upcoming_payments: upcoming
    })
    
  } catch (e: any) {
    console.error('❌ Payment stats error:', e)
    return c.json({ error: `Failed to get stats: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Cancelar pagamento agendado (Admin only)
payments.post('/:id/cancel', async (c) => {
  try {
    const user = c.get('user')
    
    if (user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403)
    }
    
    const id = c.req.param('id')
    const { reason } = await c.req.json()
    
    await c.env.DB.prepare(`
      UPDATE scheduled_payments
      SET status = 'cancelled', error_message = ?, processed_at = datetime('now')
      WHERE id = ?
    `).bind(reason || 'Cancelled by admin', id).run()
    
    // Audit log
    try {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (admin_id, action, details)
        VALUES (?, 'cancel_payment', ?)
      `).bind(
        user.sub,
        JSON.stringify({ payment_id: id, reason })
      ).run()
    } catch (logError) {
      console.error('⚠️ Falha ao registrar audit log:', logError)
    }
    
    console.log(`🚫 Pagamento ${id} cancelado por admin ${user.sub}`)
    
    return c.json({ success: true })
    
  } catch (e: any) {
    console.error('❌ Cancel payment error:', e)
    return c.json({ error: `Failed to cancel payment: ${e.message}` }, 500)
  }
})

export default payments
