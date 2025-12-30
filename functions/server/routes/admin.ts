import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { DB: D1Database }
const admin = new Hono<{ Bindings: Bindings }>()

admin.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.split(' ')[1]
  const payload = await verifySessionToken(token || '')
  if (!payload || payload.role !== 'admin') return c.json({ error: 'Unauthorized' }, 403)
  c.set('user', payload)
  await next()
})

// Listar todos os usuários (CRM)
admin.get('/users', async (c) => {
  const { search } = c.req.query()
  let query = 'SELECT id, username, email, role, created_at FROM users'
  if (search) {
    query += ` WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`
  }
  query += ' ORDER BY created_at DESC LIMIT 50'
  
  const { results } = await c.env.DB.prepare(query).run()
  return c.json(results)
})

// Promover/Banir/Editar Usuário
admin.post('/users/update-role', async (c) => {
  const { user_id, new_role } = await c.req.json()
  if (!['admin', 'streamer', 'viewer', 'banned'].includes(new_role)) {
    return c.json({ error: 'Role inválida' }, 400)
  }
  await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?').bind(new_role, user_id).run()
  return c.json({ success: true })
})

// KYC (Mantido)
admin.get('/kyc/pending', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT k.*, u.email, u.username 
    FROM kyc_verifications k
    JOIN users u ON k.user_id = u.id
    WHERE k.status = 'pending'
  `).run()
  return c.json(results)
})

admin.post('/kyc/review', async (c) => {
  const { kyc_id, action, notes } = await c.req.json()
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  await c.env.DB.prepare('UPDATE kyc_verifications SET status = ?, admin_notes = ? WHERE id = ?')
    .bind(newStatus, notes || '', kyc_id).run()
  return c.json({ success: true })
})

// Comissões (Mantido)
admin.post('/users/commission', async (c) => {
  const { user_id, rate } = await c.req.json()
  await c.env.DB.prepare('UPDATE profiles SET custom_commission_rate = ? WHERE user_id = ?').bind(rate, user_id).run()
  return c.json({ success: true })
})

export default admin
