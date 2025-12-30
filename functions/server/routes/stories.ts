import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
}

const stories = new Hono<{ Bindings: Bindings }>()

stories.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  const payload = await verifySessionToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 403)
  c.set('user', payload)
  await next()
})

// POST /api/stories - Create Story
stories.post('/', async (c) => {
  const user = c.get('user') as any
  const { media_url, type } = await c.req.json()

  if (!media_url) return c.json({ error: 'No media' }, 400)

  try {
    await c.env.DB.prepare(`
      INSERT INTO stories (user_id, media_url, type, expires_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.sub, 
      media_url, 
      type || 'image', 
      Date.now() + (24 * 60 * 60 * 1000) // 24h expiry
    ).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/stories/me - My Active Stories
stories.get('/me', async (c) => {
  const user = c.get('user') as any
  const results = await c.env.DB.prepare(`
    SELECT * FROM stories 
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).bind(user.sub, Date.now()).all()
  return c.json(results.results)
})

// GET /api/stories - Feed (All active stories from public/followed)
// ... (Simplified for this file update)

// DELETE /api/stories/:id
stories.delete('/:id', async (c) => {
    const user = c.get('user') as any
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM stories WHERE id = ? AND user_id = ?').bind(id, user.sub).run()
    return c.json({ success: true })
})

export default stories
