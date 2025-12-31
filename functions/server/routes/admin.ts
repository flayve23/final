import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
}

const admin = new Hono<{ Bindings: Bindings }>()

// RC1-FIX: Middleware com JWT_SECRET
admin.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized: No token' }, 401)
  
  const token = authHeader.split(' ')[1]
  if (!token) return c.json({ error: 'Unauthorized: Invalid token format' }, 401)
  
  // RC1-FIX: Passar JWT_SECRET
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload) {
    console.error('❌ Admin auth failed: Invalid token')
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401)
  }
  
  if (payload.role !== 'admin') {
    console.error(`❌ Admin auth failed: User ${payload.sub} is not admin (role: ${payload.role})`)
    return c.json({ error: 'Forbidden: Admin access required' }, 403)
  }
  
  c.set('user', payload)
  await next()
})

// Listar usuários
admin.get('/users', async (c) => {
  try {
    const { search } = c.req.query()
    let query = 'SELECT id, username, email, role, created_at FROM users'
    
    if (search) {
      query += ` WHERE username LIKE '%${search}%' OR email LIKE '%${search}%'`
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50'
    
    const { results } = await c.env.DB.prepare(query).run()
    return c.json(results)
  } catch (e: any) {
    console.error('❌ Admin users list error:', e)
    return c.json({ error: `Failed to fetch users: ${e.message}` }, 500)
  }
})

// RC1-FIX: Update role com melhor validação
admin.post('/users/update-role', async (c) => {
  try {
    const { user_id, new_role } = await c.req.json()
    
    if (!user_id) {
      return c.json({ error: 'user_id obrigatório' }, 400)
    }
    
    if (!new_role) {
      return c.json({ error: 'new_role obrigatório' }, 400)
    }
    
    const allowedRoles = ['admin', 'streamer', 'viewer', 'banned']
    if (!allowedRoles.includes(new_role)) {
      return c.json({ 
        error: 'Role inválida',
        allowed: allowedRoles,
        received: new_role
      }, 400)
    }
    
    // Verificar se usuário existe
    const user = await c.env.DB.prepare('SELECT id, username, role FROM users WHERE id = ?')
      .bind(user_id)
      .first()
    
    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404)
    }
    
    console.log(`🔄 Admin: Alterando role de ${user.username} (${user.role} → ${new_role})`)
    
    // Atualizar role
    const result = await c.env.DB.prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(new_role, user_id)
      .run()
    
    if (!result.success) {
      console.error('❌ Update role failed:', result)
      return c.json({ error: 'Falha ao atualizar role' }, 500)
    }
    
    console.log(`✅ Role atualizada: ${user.username} agora é ${new_role}`)
    
    return c.json({ 
      success: true,
      message: `Role de ${user.username} alterada para ${new_role}`,
      user_id,
      old_role: user.role,
      new_role
    })
    
  } catch (e: any) {
    console.error('❌ Update role error:', e)
    return c.json({ error: `Failed to update role: ${e.message}` }, 500)
  }
})

// KYC
admin.get('/kyc/pending', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT k.*, u.email, u.username 
      FROM kyc_verifications k
      JOIN users u ON k.user_id = u.id
      WHERE k.status = 'pending'
    `).run()
    return c.json(results)
  } catch (e: any) {
    console.error('❌ KYC pending error:', e)
    return c.json({ error: `Failed to fetch KYC: ${e.message}` }, 500)
  }
})

admin.post('/kyc/review', async (c) => {
  try {
    const { kyc_id, action, notes } = await c.req.json()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    await c.env.DB.prepare('UPDATE kyc_verifications SET status = ?, admin_notes = ? WHERE id = ?')
      .bind(newStatus, notes || '', kyc_id)
      .run()
    
    return c.json({ success: true })
  } catch (e: any) {
    console.error('❌ KYC review error:', e)
    return c.json({ error: `Failed to review KYC: ${e.message}` }, 500)
  }
})

// Comissões
admin.post('/users/commission', async (c) => {
  try {
    const { user_id, rate } = await c.req.json()
    
    await c.env.DB.prepare('UPDATE profiles SET custom_commission_rate = ? WHERE user_id = ?')
      .bind(rate, user_id)
      .run()
    
    return c.json({ success: true })
  } catch (e: any) {
    console.error('❌ Commission update error:', e)
    return c.json({ error: `Failed to update commission: ${e.message}` }, 500)
  }
})

export default admin
