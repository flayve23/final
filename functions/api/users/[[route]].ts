import { Hono } from 'hono';

const app = new Hono();

// GET /api/users/:id
app.get('/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const db = c.env.DB;

    const user = await db.prepare(`
      SELECT id, email, name, role, is_active, created_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    return c.json({ success: true, user });

  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({ error: 'Erro ao buscar usuário' }, 500);
  }
});

// GET /api/users/:id/wallet
app.get('/:id/wallet', async (c) => {
  try {
    const userId = c.req.param('id');
    const db = c.env.DB;

    const wallet = await db.prepare(`
      SELECT id, balance, created_at, updated_at
      FROM wallets
      WHERE user_id = ?
    `).bind(userId).first();

    if (!wallet) {
      return c.json({ error: 'Carteira não encontrada' }, 404);
    }

    return c.json({ success: true, wallet });

  } catch (error: any) {
    console.error('Get wallet error:', error);
    return c.json({ error: 'Erro ao buscar carteira' }, 500);
  }
});

// GET /api/users/:id/stats
app.get('/:id/stats', async (c) => {
  try {
    const userId = c.req.param('id');
    const db = c.env.DB;

    // Get total calls
    const callsResult = await db.prepare(`
      SELECT COUNT(*) as total
      FROM calls
      WHERE streamer_id = ? OR viewer_id = ?
    `).bind(userId, userId).first();

    // Get total earnings (for streamers)
    const earningsResult = await db.prepare(`
      SELECT SUM(total_cost) as total
      FROM calls
      WHERE streamer_id = ? AND status = 'ended'
    `).bind(userId).first();

    // Get average rating
    const ratingResult = await db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
      FROM reviews
      WHERE reviewee_id = ?
    `).bind(userId).first();

    return c.json({
      success: true,
      stats: {
        totalCalls: callsResult?.total || 0,
        totalEarnings: earningsResult?.total || 0,
        averageRating: ratingResult?.avg_rating || 0,
        totalReviews: ratingResult?.total_reviews || 0
      }
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500);
  }
});

// GET /api/users (list streamers)
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const users = await db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             AVG(r.rating) as avg_rating,
             COUNT(DISTINCT c.id) as total_calls
      FROM users u
      LEFT JOIN reviews r ON r.reviewee_id = u.id
      LEFT JOIN calls c ON c.streamer_id = u.id
      WHERE u.role = 'streamer' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY avg_rating DESC, total_calls DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return c.json({
      success: true,
      users: users.results || [],
      pagination: {
        limit,
        offset,
        total: users.results?.length || 0
      }
    });

  } catch (error: any) {
    console.error('List users error:', error);
    return c.json({ error: 'Erro ao listar usuários' }, 500);
  }
});

export default app;
