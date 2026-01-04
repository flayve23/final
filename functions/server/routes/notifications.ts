import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'
import { streamSSE } from 'hono/streaming'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
}

const notifications = new Hono<{ Bindings: Bindings }>()

// =====================================================
// MIDDLEWARE: Verificar autenticação
// =====================================================
notifications.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload) {
    return c.json({ error: 'Token inválido ou expirado' }, 401)
  }

  c.set('user', payload)
  await next()
})

// =====================================================
// HELPER: Criar notificação
// =====================================================
export async function createNotification(
  db: D1Database,
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: any
) {
  const id = crypto.randomUUID()
  
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    type,
    title,
    message,
    metadata ? JSON.stringify(metadata) : null
  ).run()

  console.log(`🔔 Notificação criada: ${type} para user ${userId}`)
  return id
}

// =====================================================
// SSE: Stream de notificações em tempo real
// =====================================================
notifications.get('/stream', async (c) => {
  const user = c.get('user') as any
  
  return streamSSE(c, async (stream) => {
    console.log(`🔴 Stream iniciado para user ${user.userId}`)
    
    // Enviar heartbeat a cada 30s para manter conexão viva
    const heartbeatInterval = setInterval(() => {
      stream.writeSSE({
        event: 'heartbeat',
        data: JSON.stringify({ timestamp: Date.now() })
      })
    }, 30000)

    // Polling de novas notificações a cada 5 segundos
    const pollInterval = setInterval(async () => {
      try {
        const result = await c.env.DB.prepare(`
          SELECT id, type, title, message, metadata, created_at
          FROM notifications
          WHERE user_id = ? AND read = 0
          ORDER BY created_at DESC
          LIMIT 10
        `).bind(user.userId).all()

        if (result.results && result.results.length > 0) {
          await stream.writeSSE({
            event: 'notification',
            data: JSON.stringify(result.results)
          })
        }
      } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error)
      }
    }, 5000)

    // Cleanup ao desconectar
    stream.onAbort(() => {
      console.log(`🔴 Stream encerrado para user ${user.userId}`)
      clearInterval(heartbeatInterval)
      clearInterval(pollInterval)
    })

    // Manter stream aberto
    await stream.sleep(1000000) // 16 minutos (Cloudflare Workers limit)
  })
})

// =====================================================
// GET: Listar notificações (histórico)
// =====================================================
notifications.get('/', async (c) => {
  const user = c.get('user') as any
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const result = await c.env.DB.prepare(`
      SELECT id, type, title, message, metadata, read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(user.userId, limit, offset).all()

    // Contar não lidas
    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ? AND read = 0
    `).bind(user.userId).first()

    return c.json({
      notifications: result.results || [],
      unread_count: countResult?.unread_count || 0,
      total: result.results?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Erro ao listar notificações:', error)
    return c.json({ error: 'Erro ao buscar notificações' }, 500)
  }
})

// =====================================================
// POST: Marcar como lida
// =====================================================
notifications.post('/:id/read', async (c) => {
  const user = c.get('user') as any
  const { id } = c.req.param()

  try {
    await c.env.DB.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE id = ? AND user_id = ?
    `).bind(id, user.userId).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao marcar notificação:', error)
    return c.json({ error: 'Erro ao atualizar notificação' }, 500)
  }
})

// =====================================================
// POST: Marcar todas como lidas
// =====================================================
notifications.post('/read-all', async (c) => {
  const user = c.get('user') as any

  try {
    await c.env.DB.prepare(`
      UPDATE notifications
      SET read = 1
      WHERE user_id = ? AND read = 0
    `).bind(user.userId).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao marcar todas notificações:', error)
    return c.json({ error: 'Erro ao atualizar notificações' }, 500)
  }
})

// =====================================================
// DELETE: Limpar notificações antigas (30 dias)
// =====================================================
notifications.delete('/cleanup', async (c) => {
  const user = c.get('user') as any

  try {
    await c.env.DB.prepare(`
      DELETE FROM notifications
      WHERE user_id = ?
      AND read = 1
      AND created_at < datetime('now', '-30 days')
    `).bind(user.userId).run()

    return c.json({ success: true, message: 'Notificações antigas removidas' })
  } catch (error: any) {
    console.error('❌ Erro ao limpar notificações:', error)
    return c.json({ error: 'Erro ao limpar notificações' }, 500)
  }
})

export default notifications
