import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'
import { createNotification } from './notifications'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
  BUCKET: R2Bucket
}

const tickets = new Hono<{ Bindings: Bindings }>()

// =====================================================
// MIDDLEWARE: Verificar autenticação
// =====================================================
tickets.use('/*', async (c, next) => {
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
// POST: Criar novo ticket
// =====================================================
tickets.post('/', async (c) => {
  const user = c.get('user') as any
  const { subject, category, message } = await c.req.json()

  if (!subject || !category || !message) {
    return c.json({ error: 'Campos obrigatórios: subject, category, message' }, 400)
  }

  const validCategories = ['technical', 'payment', 'account', 'abuse', 'other']
  if (!validCategories.includes(category)) {
    return c.json({ error: 'Categoria inválida' }, 400)
  }

  try {
    const ticketId = crypto.randomUUID()
    const messageId = crypto.randomUUID()

    // Criar ticket
    await c.env.DB.prepare(`
      INSERT INTO tickets (id, user_id, subject, category, status, last_reply_at)
      VALUES (?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)
    `).bind(ticketId, user.userId, subject, category).run()

    // Adicionar primeira mensagem
    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, user_id, message, is_admin)
      VALUES (?, ?, ?, ?, 0)
    `).bind(messageId, ticketId, user.userId, message).run()

    // Notificar admins
    const admins = await c.env.DB.prepare(`
      SELECT id FROM users WHERE role = 'admin'
    `).all()

    for (const admin of admins.results || []) {
      await createNotification(
        c.env.DB,
        admin.id as string,
        'ticket_new',
        'Novo ticket de suporte',
        `${subject} - Categoria: ${category}`,
        { ticket_id: ticketId }
      )
    }

    console.log(`🎫 Ticket criado: ${ticketId} por user ${user.userId}`)

    return c.json({
      success: true,
      ticket_id: ticketId,
      message: 'Ticket criado com sucesso'
    }, 201)
  } catch (error: any) {
    console.error('❌ Erro ao criar ticket:', error)
    return c.json({ error: 'Erro ao criar ticket' }, 500)
  }
})

// =====================================================
// GET: Listar tickets do usuário
// =====================================================
tickets.get('/my-tickets', async (c) => {
  const user = c.get('user') as any
  const status = c.req.query('status') // filtro opcional

  try {
    let query = `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
        (SELECT message FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message
      FROM tickets t
      WHERE t.user_id = ?
    `
    const params = [user.userId]

    if (status) {
      query += ` AND t.status = ?`
      params.push(status)
    }

    query += ` ORDER BY t.last_reply_at DESC LIMIT 50`

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      tickets: result.results || [],
      total: result.results?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Erro ao listar tickets:', error)
    return c.json({ error: 'Erro ao buscar tickets' }, 500)
  }
})

// =====================================================
// GET: Detalhes do ticket + mensagens
// =====================================================
tickets.get('/:id', async (c) => {
  const user = c.get('user') as any
  const { id } = c.req.param()

  try {
    // Buscar ticket
    const ticket = await c.env.DB.prepare(`
      SELECT t.*, u.username as user_name
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `).bind(id).first()

    if (!ticket) {
      return c.json({ error: 'Ticket não encontrado' }, 404)
    }

    // Verificar permissão (dono ou admin)
    if (ticket.user_id !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Sem permissão' }, 403)
    }

    // Buscar mensagens
    const messages = await c.env.DB.prepare(`
      SELECT tm.*, u.username, u.role
      FROM ticket_messages tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `).bind(id).all()

    return c.json({
      ticket,
      messages: messages.results || []
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar ticket:', error)
    return c.json({ error: 'Erro ao carregar ticket' }, 500)
  }
})

// =====================================================
// POST: Adicionar mensagem ao ticket
// =====================================================
tickets.post('/:id/reply', async (c) => {
  const user = c.get('user') as any
  const { id } = c.req.param()
  const { message } = await c.req.json()

  if (!message || message.trim().length === 0) {
    return c.json({ error: 'Mensagem não pode ser vazia' }, 400)
  }

  try {
    // Verificar se ticket existe e se user tem permissão
    const ticket = await c.env.DB.prepare(`
      SELECT * FROM tickets WHERE id = ?
    `).bind(id).first()

    if (!ticket) {
      return c.json({ error: 'Ticket não encontrado' }, 404)
    }

    if (ticket.user_id !== user.userId && user.role !== 'admin') {
      return c.json({ error: 'Sem permissão' }, 403)
    }

    // Inserir mensagem
    const messageId = crypto.randomUUID()
    const isAdmin = user.role === 'admin' ? 1 : 0

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, user_id, message, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `).bind(messageId, id, user.userId, message, isAdmin).run()

    // Atualizar last_reply_at e status
    const newStatus = isAdmin ? 'waiting_user' : 'waiting_admin'
    await c.env.DB.prepare(`
      UPDATE tickets
      SET last_reply_at = CURRENT_TIMESTAMP, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newStatus, id).run()

    // Notificar a outra parte
    if (isAdmin) {
      // Admin respondeu -> notificar usuário
      await createNotification(
        c.env.DB,
        ticket.user_id as string,
        'ticket_reply',
        'Resposta no seu ticket',
        message.substring(0, 100),
        { ticket_id: id }
      )
    } else {
      // Usuário respondeu -> notificar admin atribuído ou todos admins
      const targetAdmins = ticket.assigned_to 
        ? [{ id: ticket.assigned_to }]
        : await c.env.DB.prepare(`SELECT id FROM users WHERE role = 'admin'`).all().then(r => r.results || [])

      for (const admin of targetAdmins) {
        await createNotification(
          c.env.DB,
          admin.id as string,
          'ticket_reply',
          `Nova mensagem no ticket #${id.substring(0, 8)}`,
          message.substring(0, 100),
          { ticket_id: id }
        )
      }
    }

    console.log(`💬 Mensagem adicionada ao ticket ${id} por ${user.userId}`)

    return c.json({ success: true, message_id: messageId })
  } catch (error: any) {
    console.error('❌ Erro ao adicionar mensagem:', error)
    return c.json({ error: 'Erro ao enviar mensagem' }, 500)
  }
})

// =====================================================
// ADMIN: Listar todos os tickets
// =====================================================
tickets.get('/admin/all', async (c) => {
  const user = c.get('user') as any

  if (user.role !== 'admin') {
    return c.json({ error: 'Apenas admins' }, 403)
  }

  const status = c.req.query('status')
  const priority = c.req.query('priority')

  try {
    let query = `
      SELECT 
        t.*,
        u.username,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (status) {
      query += ` AND t.status = ?`
      params.push(status)
    }

    if (priority) {
      query += ` AND t.priority = ?`
      params.push(priority)
    }

    query += ` ORDER BY 
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      t.last_reply_at DESC
      LIMIT 100
    `

    const result = await c.env.DB.prepare(query).bind(...params).all()

    return c.json({
      tickets: result.results || [],
      total: result.results?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Erro ao listar tickets (admin):', error)
    return c.json({ error: 'Erro ao buscar tickets' }, 500)
  }
})

// =====================================================
// ADMIN: Atualizar status/prioridade/atribuição
// =====================================================
tickets.patch('/:id', async (c) => {
  const user = c.get('user') as any

  if (user.role !== 'admin') {
    return c.json({ error: 'Apenas admins' }, 403)
  }

  const { id } = c.req.param()
  const { status, priority, assigned_to } = await c.req.json()

  try {
    const updates: string[] = []
    const params: any[] = []

    if (status) {
      updates.push('status = ?')
      params.push(status)
    }

    if (priority) {
      updates.push('priority = ?')
      params.push(priority)
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?')
      params.push(assigned_to)
    }

    if (updates.length === 0) {
      return c.json({ error: 'Nenhum campo para atualizar' }, 400)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    await c.env.DB.prepare(`
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run()

    console.log(`🎫 Ticket ${id} atualizado por admin ${user.userId}`)

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar ticket:', error)
    return c.json({ error: 'Erro ao atualizar ticket' }, 500)
  }
})

export default tickets
