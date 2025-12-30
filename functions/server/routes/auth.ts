import { Hono } from 'hono'
import { hashPassword, verifyPassword, createSessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

// Signup
auth.post('/signup', async (c) => {
  try {
    // 1. Check ENV
    if (!c.env.DB) return c.json({ error: 'CONFIG ERROR: DB binding is missing.' }, 500)
    if (!c.env.JWT_SECRET) return c.json({ error: 'CONFIG ERROR: JWT_SECRET is missing.' }, 500)

    const { username, email, password, role } = await c.req.json()

    if (!username || !email || !password) {
      return c.json({ error: 'Dados incompletos' }, 400)
    }

    // 2. Check Database Connection
    try {
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
        if (existingUser) {
          return c.json({ error: 'Email já cadastrado' }, 409)
        }
    } catch (dbError: any) {
        return c.json({ error: `DB ERROR: ${dbError.message}` }, 500)
    }

    const salt = crypto.randomUUID()
    const password_hash = await hashPassword(password, salt)

    // 3. Insert User
    const result = await c.env.DB.prepare(`
      INSERT INTO users (username, email, password_hash, salt, role)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, username, email, role, created_at
    `).bind(username, email, password_hash, salt, role || 'viewer').first()

    if (!result) return c.json({ error: 'Falha ao criar usuário no banco' }, 500)

    // 4. Create Profile
    if (role === 'streamer') {
      await c.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio_name, price_per_minute)
        VALUES (?, ?, 10.00)
      `).bind(result.id, username).run()
    } else {
        // Create wallet for viewer
        // (Optional, wallet can be created on first recharge)
    }

    const token = await createSessionToken({ 
      sub: result.id, 
      email: result.email, 
      role: result.role 
    }, c.env.JWT_SECRET)

    return c.json({ token, user: result })
  } catch (e: any) {
    return c.json({ error: `SERVER ERROR: ${e.message}` }, 500)
  }
})

// Login
auth.post('/login', async (c) => {
  try {
    if (!c.env.DB) return c.json({ error: 'CONFIG ERROR: DB binding missing' }, 500)
    
    const { email, password } = await c.req.json()

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any

    if (!user) {
      return c.json({ error: 'Credenciais inválidas' }, 401)
    }

    const isValid = await verifyPassword(password, user.salt, user.password_hash)

    if (!isValid) {
      return c.json({ error: 'Credenciais inválidas' }, 401)
    }

    if (!c.env.JWT_SECRET) return c.json({ error: 'CONFIG ERROR: JWT_SECRET missing' }, 500)

    const token = await createSessionToken({ 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    }, c.env.JWT_SECRET)

    return c.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      } 
    })
  } catch (e: any) {
    return c.json({ error: `LOGIN ERROR: ${e.message}` }, 500)
  }
})

export default auth
