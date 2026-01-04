import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'
import { createNotification } from './notifications'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
}

const favorites = new Hono<{ Bindings: Bindings }>()

// =====================================================
// MIDDLEWARE: Verificar autenticação
// =====================================================
favorites.use('/*', async (c, next) => {
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
// GET: Listar favoritos do usuário
// =====================================================
favorites.get('/', async (c) => {
  const user = c.get('user') as any

  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        f.*,
        u.username,
        p.avatar_url,
        p.bio,
        p.price_per_minute,
        p.is_online,
        p.last_seen_at,
        (SELECT COUNT(*) FROM calls WHERE streamer_id = f.streamer_id AND status = 'completed') as total_calls
      FROM favorites f
      JOIN users u ON u.id = f.streamer_id
      LEFT JOIN profiles p ON p.id = f.streamer_id
      WHERE f.user_id = ?
      ORDER BY p.is_online DESC, f.created_at DESC
    `).bind(user.userId).all()

    return c.json({
      favorites: result.results || [],
      total: result.results?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Erro ao listar favoritos:', error)
    return c.json({ error: 'Erro ao carregar favoritos' }, 500)
  }
})

// =====================================================
// POST: Adicionar favorito
// =====================================================
favorites.post('/', async (c) => {
  const user = c.get('user') as any
  const { streamer_id, notify_on_online } = await c.req.json()

  if (!streamer_id) {
    return c.json({ error: 'streamer_id é obrigatório' }, 400)
  }

  // Verificar se streamer existe
  const streamer = await c.env.DB.prepare(`
    SELECT id, role FROM users WHERE id = ?
  `).bind(streamer_id).first()

  if (!streamer) {
    return c.json({ error: 'Streamer não encontrado' }, 404)
  }

  if (streamer.role !== 'streamer') {
    return c.json({ error: 'Usuário não é um streamer' }, 400)
  }

  try {
    const id = crypto.randomUUID()

    await c.env.DB.prepare(`
      INSERT INTO favorites (id, user_id, streamer_id, notify_on_online)
      VALUES (?, ?, ?, ?)
    `).bind(
      id,
      user.userId,
      streamer_id,
      notify_on_online !== undefined ? notify_on_online : 1
    ).run()

    console.log(`⭐ Favorito adicionado: user ${user.userId} -> streamer ${streamer_id}`)

    // Notificar streamer
    await createNotification(
      c.env.DB,
      streamer_id,
      'new_follower',
      'Novo seguidor!',
      'Alguém adicionou você aos favoritos',
      { user_id: user.userId }
    )

    return c.json({ success: true, favorite_id: id }, 201)
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return c.json({ error: 'Streamer já está nos favoritos' }, 409)
    }
    
    console.error('❌ Erro ao adicionar favorito:', error)
    return c.json({ error: 'Erro ao adicionar favorito' }, 500)
  }
})

// =====================================================
// DELETE: Remover favorito
// =====================================================
favorites.delete('/:streamer_id', async (c) => {
  const user = c.get('user') as any
  const { streamer_id } = c.req.param()

  try {
    await c.env.DB.prepare(`
      DELETE FROM favorites
      WHERE user_id = ? AND streamer_id = ?
    `).bind(user.userId, streamer_id).run()

    console.log(`⭐ Favorito removido: user ${user.userId} -> streamer ${streamer_id}`)

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao remover favorito:', error)
    return c.json({ error: 'Erro ao remover favorito' }, 500)
  }
})

// =====================================================
// PUT: Atualizar configurações de notificação
// =====================================================
favorites.put('/:streamer_id/notify', async (c) => {
  const user = c.get('user') as any
  const { streamer_id } = c.req.param()
  const { notify_on_online } = await c.req.json()

  try {
    await c.env.DB.prepare(`
      UPDATE favorites
      SET notify_on_online = ?
      WHERE user_id = ? AND streamer_id = ?
    `).bind(notify_on_online ? 1 : 0, user.userId, streamer_id).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar notificação:', error)
    return c.json({ error: 'Erro ao atualizar configuração' }, 500)
  }
})

// =====================================================
// GET: Verificar se streamer está nos favoritos
// =====================================================
favorites.get('/check/:streamer_id', async (c) => {
  const user = c.get('user') as any
  const { streamer_id } = c.req.param()

  try {
    const favorite = await c.env.DB.prepare(`
      SELECT id FROM favorites
      WHERE user_id = ? AND streamer_id = ?
    `).bind(user.userId, streamer_id).first()

    return c.json({ 
      is_favorite: !!favorite,
      favorite_id: favorite?.id || null
    })
  } catch (error: any) {
    console.error('❌ Erro ao verificar favorito:', error)
    return c.json({ error: 'Erro ao verificar' }, 500)
  }
})

// =====================================================
// GET: Streamers online dos favoritos
// =====================================================
favorites.get('/online', async (c) => {
  const user = c.get('user') as any

  try {
    const result = await c.env.DB.prepare(`
      SELECT 
        u.id,
        u.username,
        p.avatar_url,
        p.price_per_minute,
        p.last_seen_at
      FROM favorites f
      JOIN users u ON u.id = f.streamer_id
      JOIN profiles p ON p.id = f.streamer_id
      WHERE f.user_id = ? AND p.is_online = 1
      ORDER BY p.last_seen_at DESC
    `).bind(user.userId).all()

    return c.json({
      online_favorites: result.results || [],
      count: result.results?.length || 0
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar online:', error)
    return c.json({ error: 'Erro ao carregar' }, 500)
  }
})

// =====================================================
// HELPER: Notificar seguidores quando streamer fica online
// =====================================================
export async function notifyFollowersOnline(
  db: D1Database,
  streamerId: string
) {
  try {
    // Buscar seguidores com notificação ativada
    const followers = await db.prepare(`
      SELECT user_id FROM favorites
      WHERE streamer_id = ? AND notify_on_online = 1
    `).bind(streamerId).all()

    const streamer = await db.prepare(`
      SELECT username FROM users WHERE id = ?
    `).bind(streamerId).first()

    // Notificar cada seguidor
    for (const follower of followers.results || []) {
      await createNotification(
        db,
        follower.user_id as string,
        'favorite_online',
        `${streamer?.username} está online!`,
        'Seu streamer favorito acabou de ficar online',
        { streamer_id: streamerId }
      )
    }

    console.log(`🔔 ${followers.results?.length || 0} seguidores notificados: ${streamerId} online`)
  } catch (error) {
    console.error('❌ Erro ao notificar seguidores:', error)
  }
}

export default favorites
