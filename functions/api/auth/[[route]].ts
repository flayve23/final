import { Hono } from 'hono';
import { sign } from 'hono/jwt';

const app = new Hono();

// Utility: Generate UUID
function generateId() {
  return crypto.randomUUID();
}

// Utility: Hash password (simple for demo)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// POST /api/auth/register
app.post('/register', async (c) => {
  try {
    const { email, password, name, role = 'viewer' } = await c.req.json();

    // Validation
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password e nome são obrigatórios' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, 400);
    }

    if (!['viewer', 'streamer'].includes(role)) {
      return c.json({ error: 'Role inválido' }, 400);
    }

    const db = c.env.DB;
    
    // Check if email exists
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      return c.json({ error: 'Email já cadastrado' }, 409);
    }

    // Create user
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    
    await db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, email, passwordHash, name, role, Date.now(), Date.now()).run();

    // Create wallet
    const walletId = generateId();
    await db.prepare(`
      INSERT INTO wallets (id, user_id, balance, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)
    `).bind(walletId, userId, Date.now(), Date.now()).run();

    // Generate JWT
    const jwtSecret = c.env.JWT_SECRET || 'flayve2026secretkeysupersecure1234567890abcdef';
    const token = await sign({ userId, email, role }, jwtSecret);

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name,
        role
      }
    }, 201);

  } catch (error: any) {
    console.error('Register error:', error);
    return c.json({ error: 'Erro ao criar conta', details: error.message }, 500);
  }
});

// POST /api/auth/login
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email e senha são obrigatórios' }, 400);
    }

    const db = c.env.DB;
    const passwordHash = await hashPassword(password);

    // Find user
    const user = await db.prepare(`
      SELECT id, email, name, role, is_active
      FROM users
      WHERE email = ? AND password_hash = ?
    `).bind(email, passwordHash).first();

    if (!user) {
      return c.json({ error: 'Email ou senha incorretos' }, 401);
    }

    if (!user.is_active) {
      return c.json({ error: 'Conta desativada' }, 403);
    }

    // Generate JWT
    const jwtSecret = c.env.JWT_SECRET || 'flayve2026secretkeysupersecure1234567890abcdef';
    const token = await sign({ 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    }, jwtSecret);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({ error: 'Erro ao fazer login', details: error.message }, 500);
  }
});

// GET /api/auth/me
app.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Token não fornecido' }, 401);
    }

    // For demo, extract userId from token manually
    // In production, use proper JWT verification
    return c.json({
      success: true,
      user: {
        id: 'demo-user-id',
        email: 'demo@flayve.com',
        name: 'Demo User',
        role: 'viewer'
      }
    });

  } catch (error: any) {
    console.error('Auth me error:', error);
    return c.json({ error: 'Erro ao verificar autenticação' }, 500);
  }
});

export default app;
