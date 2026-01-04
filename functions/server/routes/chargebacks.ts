import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  MERCADO_PAGO_ACCESS_TOKEN: string
}

const chargebacks = new Hono<{ Bindings: Bindings }>()

// Middleware: Admin only
chargebacks.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload || payload.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }
  
  c.set('user', payload)
  await next()
})

// V104 SPRINT 2: Listar chargebacks
chargebacks.get('/list', async (c) => {
  try {
    const { status } = c.req.query()
    
    let query = `
      SELECT 
        cb.*,
        viewer.username as viewer_username,
        viewer.email as viewer_email,
        streamer.username as streamer_username,
        call.duration_seconds,
        call.created_at as call_date,
        tx.type as transaction_type
      FROM chargebacks cb
      JOIN users viewer ON cb.user_id = viewer.id
      LEFT JOIN users streamer ON cb.streamer_id = streamer.id
      LEFT JOIN calls call ON cb.call_id = call.id
      JOIN transactions tx ON cb.transaction_id = tx.id
    `
    
    const params: any[] = []
    
    if (status && status !== 'all') {
      query += ' WHERE cb.status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY cb.created_at DESC LIMIT 100'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json({ chargebacks: results })
    
  } catch (e: any) {
    console.error('❌ Chargebacks list error:', e)
    return c.json({ error: `Failed to list chargebacks: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Detalhes de um chargeback (com logs da sessão)
chargebacks.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Buscar chargeback completo
    const chargeback = await c.env.DB.prepare(`
      SELECT 
        cb.*,
        viewer.username as viewer_username,
        viewer.email as viewer_email,
        streamer.username as streamer_username,
        streamer.email as streamer_email,
        call.duration_seconds,
        call.cost_total,
        call.created_at as call_date,
        call.started_at,
        call.ended_at,
        tx.amount as transaction_amount,
        tx.status as transaction_status
      FROM chargebacks cb
      JOIN users viewer ON cb.user_id = viewer.id
      LEFT JOIN users streamer ON cb.streamer_id = streamer.id
      LEFT JOIN calls call ON cb.call_id = call.id
      JOIN transactions tx ON cb.transaction_id = tx.id
      WHERE cb.id = ?
    `).bind(id).first()
    
    if (!chargeback) {
      return c.json({ error: 'Chargeback not found' }, 404)
    }
    
    // Buscar histórico de transações do viewer (últimos 30 dias)
    const { results: viewerHistory } = await c.env.DB.prepare(`
      SELECT type, amount, status, created_at
      FROM transactions
      WHERE user_id = ? AND created_at >= date('now', '-30 days')
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(chargeback.user_id).all()
    
    return c.json({
      chargeback,
      viewer_history: viewerHistory
    })
    
  } catch (e: any) {
    console.error('❌ Chargeback details error:', e)
    return c.json({ error: `Failed to get chargeback: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Tomar decisão sobre chargeback
chargebacks.post('/:id/decision', async (c) => {
  try {
    const id = c.req.param('id')
    const { decision, notes } = await c.req.json()
    
    // Validar decisão
    const validDecisions = ['refund', 'keep', 'partial']
    if (!validDecisions.includes(decision)) {
      return c.json({ 
        error: 'Decisão inválida',
        valid: validDecisions 
      }, 400)
    }
    
    // Buscar chargeback
    const cb = await c.env.DB.prepare(
      'SELECT * FROM chargebacks WHERE id = ?'
    ).bind(id).first()
    
    if (!cb) {
      return c.json({ error: 'Chargeback not found' }, 404)
    }
    
    // Atualizar status
    const newStatus = decision === 'refund' ? 'accepted' : 'rejected'
    
    await c.env.DB.prepare(`
      UPDATE chargebacks 
      SET status = ?, admin_decision = ?, admin_notes = ?, resolved_at = datetime('now')
      WHERE id = ?
    `).bind(newStatus, decision, notes || '', id).run()
    
    // Se for refund, criar transação de estorno
    if (decision === 'refund') {
      await c.env.DB.prepare(`
        INSERT INTO transactions (user_id, type, amount, status, metadata)
        VALUES (?, 'refund', ?, 'completed', ?)
      `).bind(
        cb.user_id,
        cb.amount,
        JSON.stringify({ chargeback_id: id, reason: 'Admin approved refund' })
      ).run()
      
      console.log(`💰 Estorno processado: R$ ${cb.amount} para user ${cb.user_id}`)
    }
    
    // Registrar no audit log
    const adminUser = c.get('user')
    try {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (admin_id, action, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        adminUser.sub,
        'chargeback_decision',
        cb.user_id,
        JSON.stringify({ chargeback_id: id, decision, amount: cb.amount })
      ).run()
    } catch (logError) {
      console.error('⚠️ Falha ao registrar audit log:', logError)
    }
    
    console.log(`✅ Chargeback ${id} resolvido: ${decision}`)
    
    return c.json({ 
      success: true,
      decision,
      new_status: newStatus
    })
    
  } catch (e: any) {
    console.error('❌ Chargeback decision error:', e)
    return c.json({ error: `Failed to process decision: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Stats de chargebacks
chargebacks.get('/stats/overview', async (c) => {
  try {
    // Total de chargebacks por status
    const { results: byStatus } = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count, SUM(amount) as total_amount
      FROM chargebacks
      GROUP BY status
    `).all()
    
    // Total geral
    const total = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM chargebacks
    `).first()
    
    // Chargebacks nos últimos 30 dias
    const recent = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM chargebacks
      WHERE created_at >= date('now', '-30 days')
    `).first()
    
    return c.json({
      by_status: byStatus,
      total,
      recent_30_days: recent.count
    })
    
  } catch (e: any) {
    console.error('❌ Chargeback stats error:', e)
    return c.json({ error: `Failed to get stats: ${e.message}` }, 500)
  }
})

export default chargebacks
