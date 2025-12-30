import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { DB: D1Database }
const profiles = new Hono<{ Bindings: Bindings }>()

// Public & Middleware (Same as before)
profiles.get('/public/:id', async (c) => {
  const id = c.req.param('id')
  const profile = await c.env.DB.prepare(`
    SELECT p.*, u.username, u.id as user_id FROM profiles p JOIN users u ON p.user_id = u.id WHERE u.id = ?
  `).bind(id).first()
  if (!profile) return c.json({ error: 'Not found' }, 404)
  return c.json(profile)
})

profiles.use('*', async (c, next) => {
  if (c.req.path.includes('/public/')) return next()
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  const payload = await verifySessionToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 403)
  c.set('user', payload)
  await next()
})

profiles.get('/me', async (c) => {
  const user = c.get('user') as any
  const profile = await c.env.DB.prepare(`
    SELECT p.*, u.username, u.email, u.role, u.id as user_id FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = ?
  `).bind(user.sub).first()
  return c.json(profile)
})

// PUT /me (ROBUST FIX)
profiles.put('/me', async (c) => {
  const user = c.get('user') as any
  const body = await c.req.json()
  
  // Explicit casting to ensure SQLite doesn't choke
  const bio_name = String(body.bio_name || '')
  const bio_description = String(body.bio_description || '')
  const price = Number(body.price_per_minute || 10)
  const is_public = body.is_public ? 1 : 0
  const photo_url = body.photo_url ? String(body.photo_url) : null

  try {
    // 1. Try Update first
    const update = await c.env.DB.prepare(`
      UPDATE profiles 
      SET bio_name = ?, bio_description = ?, price_per_minute = ?, is_public = ?, photo_url = ?
      WHERE user_id = ?
    `).bind(bio_name, bio_description, price, is_public, photo_url, user.sub).run()

    // 2. If no rows changed, Insert
    if (update.meta.changes === 0) {
      await c.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio_name, bio_description, price_per_minute, is_public, photo_url, is_online)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(user.sub, bio_name, bio_description, price, is_public, photo_url).run()
    }
    
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: `DB Save Error: ${e.message}` }, 500)
  }
})

profiles.get('/', async (c) => {
  const list = await c.env.DB.prepare(`
    SELECT p.*, u.username, u.id as user_id FROM profiles p JOIN users u ON p.user_id = u.id 
    WHERE u.role = 'streamer' AND p.is_public = 1
  `).all()
  return c.json(list.results)
})

export default profiles
