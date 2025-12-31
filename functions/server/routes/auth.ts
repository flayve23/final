import { Hono } from 'hono'
import { hashPassword, verifyPassword, createSessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const auth = new Hono<{ Bindings: Bindings }>()

// RC1-FIX: Signup com melhor tratamento de erros
auth.post('/signup', async (c) => {
  try {
    if (!c.env.DB) return c.json({ error: 'CONFIG ERROR: DB binding is missing.' }, 500)
    if (!c.env.JWT_SECRET) return c.json({ error: 'CONFIG ERROR: JWT_SECRET is missing.' }, 500)

    const { username, email, password, role } = await c.req.json()

    if (!username || !email || !password) {
      return c.json({ error: 'Dados incompletos' }, 400)
    }

    // Verificar usuário existente
    try {
        const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
        if (existingUser) {
          return c.json({ error: 'Email já cadastrado' }, 409)
        }
    } catch (dbError: any) {
        console.error('❌ DB Check Error:', dbError)
        return c.json({ error: `DB ERROR: ${dbError.message}` }, 500)
    }

    const salt = crypto.randomUUID()
    const password_hash = await hashPassword(password, salt)

    // Inserir usuário
    const result = await c.env.DB.prepare(`
      INSERT INTO users (username, email, password_hash, salt, role)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, username, email, role, created_at
    `).bind(username, email, password_hash, salt, role || 'viewer').first()

    if (!result) {
      console.error('❌ Insert user failed: no result')
      return c.json({ error: 'Falha ao criar usuário no banco' }, 500)
    }

    console.log(`✅ Usuário criado: ${result.id} (${result.email})`)

    // RC1-FIX: Criar profile com try/catch para não quebrar signup
    if (role === 'streamer') {
      try {
        await c.env.DB.prepare(`
          INSERT INTO profiles (user_id, bio_name, price_per_minute, is_online)
          VALUES (?, ?, 10.00, 0)
        `).bind(result.id, username).run()
        
        console.log(`✅ Profile criado para streamer ${result.id}`)
      } catch (profileError: any) {
        console.error('⚠️ Profile creation failed (non-critical):', profileError)
        // Não retorna erro - profile pode ser criado depois
      }
    }

    const token = await createSessionToken({ 
      sub: result.id, 
      email: result.email, 
      role: result.role 
    }, c.env.JWT_SECRET)

    return c.json({ 
      token, 
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role
      }
    })
  } catch (e: any) {
    console.error('❌ Signup Error:', e)
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

    // RC1-FIX: Verificar se usuário está banido
    if (user.role === 'banned') {
      return c.json({ error: 'Usuário banido. Entre em contato com o suporte.' }, 403)
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
    console.error('❌ Login Error:', e)
    return c.json({ error: `LOGIN ERROR: ${e.message}` }, 500)
  }
})

export default auth
