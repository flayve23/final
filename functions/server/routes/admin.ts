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
    
    // V104: Registrar no audit log
    const adminUser = c.get('user')
    try {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (admin_id, action, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        adminUser.sub,
        new_role === 'banned' ? 'ban_user' : 'update_role',
        user_id,
        JSON.stringify({ old_role: user.role, new_role, reason: 'Admin action' })
      ).run()
      console.log(`📝 Audit log registrado: admin ${adminUser.sub} ${new_role === 'banned' ? 'baniu' : 'alterou role de'} user ${user_id}`)
    } catch (logError) {
      console.error('⚠️ Falha ao registrar audit log:', logError)
      // Não falhar a requisição se o log der erro
    }
    
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
    
    // Buscar dados do KYC antes de atualizar
    const kyc = await c.env.DB.prepare('SELECT user_id FROM kyc_verifications WHERE id = ?')
      .bind(kyc_id)
      .first()
    
    if (!kyc) {
      return c.json({ error: 'KYC não encontrado' }, 404)
    }
    
    await c.env.DB.prepare('UPDATE kyc_verifications SET status = ?, admin_notes = ?, reviewed_at = datetime("now") WHERE id = ?')
      .bind(newStatus, notes || '', kyc_id)
      .run()
    
    // V104: Registrar no audit log
    const adminUser = c.get('user')
    try {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (admin_id, action, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        adminUser.sub,
        action === 'approve' ? 'approve_kyc' : 'reject_kyc',
        kyc.user_id,
        JSON.stringify({ kyc_id, notes: notes || 'Sem observações' })
      ).run()
    } catch (logError) {
      console.error('⚠️ Falha ao registrar audit log:', logError)
    }
    
    console.log(`✅ KYC ${kyc_id} ${newStatus} por admin ${adminUser.sub}`)
    
    return c.json({ success: true, status: newStatus })
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
    
    // V104: Registrar no audit log
    const adminUser = c.get('user')
    try {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (admin_id, action, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `).bind(
        adminUser.sub,
        'update_commission',
        user_id,
        JSON.stringify({ new_rate: rate })
      ).run()
    } catch (logError) {
      console.error('⚠️ Falha ao registrar audit log:', logError)
    }
    
    return c.json({ success: true })
  } catch (e: any) {
    console.error('❌ Commission update error:', e)
    return c.json({ error: `Failed to update commission: ${e.message}` }, 500)
  }
})

// V104: Listar Audit Logs
admin.get('/audit-logs', async (c) => {
  try {
    const { action } = c.req.query()
    
    let query = `
      SELECT 
        a.*,
        admin_user.username as admin_username,
        target_user.username as target_username
      FROM audit_logs a
      LEFT JOIN users admin_user ON a.admin_id = admin_user.id
      LEFT JOIN users target_user ON a.target_user_id = target_user.id
    `
    
    const params: any[] = []
    
    if (action) {
      query += ' WHERE a.action = ?'
      params.push(action)
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT 500'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    
    return c.json(results)
  } catch (e: any) {
    console.error('❌ Audit logs error:', e)
    return c.json({ error: `Failed to fetch audit logs: ${e.message}` }, 500)
  }
})

export default admin
