import { Hono } from 'hono';

const app = new Hono();

function generateId() {
  return crypto.randomUUID();
}

// GET /api/admin/fraud/flags
app.get('/flags', async (c) => {
  try {
    const db = c.env.DB;
    const severity = c.req.query('severity');
    const reviewed = c.req.query('reviewed');
    const limit = parseInt(c.req.query('limit') || '50');

    let query = `
      SELECT ff.*,
             u.name as user_name,
             u.email as user_email
      FROM fraud_flags ff
      JOIN users u ON u.id = ff.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (severity) {
      query += ` AND ff.severity = ?`;
      params.push(severity);
    }

    if (reviewed !== undefined) {
      query += ` AND ff.reviewed = ?`;
      params.push(reviewed === 'true' ? 1 : 0);
    }

    query += ` ORDER BY ff.created_at DESC LIMIT ?`;
    params.push(limit);

    const flags = await db.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      flags: flags.results || []
    });

  } catch (error: any) {
    console.error('Get fraud flags error:', error);
    return c.json({ error: 'Erro ao buscar flags de fraude' }, 500);
  }
});

// GET /api/admin/fraud/stats
app.get('/stats', async (c) => {
  try {
    const db = c.env.DB;

    // Count by severity
    const bySeverity = await db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM fraud_flags
      WHERE reviewed = 0
      GROUP BY severity
    `).all();

    // Total blocked amount
    const blockedAmount = await db.prepare(`
      SELECT SUM(amount) as total
      FROM pending_withdrawals
      WHERE status = 'blocked'
    `).first();

    // Recent flags (last 24h)
    const recentFlags = await db.prepare(`
      SELECT COUNT(*) as count
      FROM fraud_flags
      WHERE created_at > ?
    `).bind(Date.now() - 86400000).first();

    return c.json({
      success: true,
      stats: {
        bySeverity: bySeverity.results || [],
        totalBlockedAmount: blockedAmount?.total || 0,
        recentFlags: recentFlags?.count || 0
      }
    });

  } catch (error: any) {
    console.error('Get fraud stats error:', error);
    return c.json({ error: 'Erro ao buscar estatísticas de fraude' }, 500);
  }
});

// PATCH /api/admin/fraud/flags/:id/review
app.patch('/flags/:id/review', async (c) => {
  try {
    const flagId = c.req.param('id');
    const { reviewerId, action } = await c.req.json(); // action: 'dismiss' | 'escalate' | 'block'

    if (!reviewerId || !action) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const db = c.env.DB;

    await db.prepare(`
      UPDATE fraud_flags
      SET reviewed = 1,
          reviewed_by = ?,
          reviewed_at = ?
      WHERE id = ?
    `).bind(reviewerId, Date.now(), flagId).run();

    // If action is 'block', deactivate user
    if (action === 'block') {
      const flag = await db.prepare(`
        SELECT user_id FROM fraud_flags WHERE id = ?
      `).bind(flagId).first();

      if (flag) {
        await db.prepare(`
          UPDATE users SET is_active = 0 WHERE id = ?
        `).bind(flag.user_id).run();
      }
    }

    return c.json({
      success: true,
      message: `Flag ${action === 'dismiss' ? 'dispensada' : action === 'block' ? 'bloqueada' : 'escalada'}`
    });

  } catch (error: any) {
    console.error('Review flag error:', error);
    return c.json({ error: 'Erro ao revisar flag' }, 500);
  }
});

// POST /api/admin/fraud/flags (manual flag creation)
app.post('/flags', async (c) => {
  try {
    const { userId, flagType, severity, description, metadata } = await c.req.json();

    if (!userId || !flagType || !severity || !description) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const db = c.env.DB;
    const flagId = generateId();

    await db.prepare(`
      INSERT INTO fraud_flags (id, user_id, flag_type, severity, description, metadata, auto_generated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).bind(flagId, userId, flagType, severity, description, metadata || null, Date.now()).run();

    return c.json({
      success: true,
      message: 'Flag criada com sucesso',
      flagId
    }, 201);

  } catch (error: any) {
    console.error('Create flag error:', error);
    return c.json({ error: 'Erro ao criar flag' }, 500);
  }
});

export default app;
