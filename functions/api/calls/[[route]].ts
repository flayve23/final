import { Hono } from 'hono';

const app = new Hono();

function generateId() {
  return crypto.randomUUID();
}

// POST /api/calls (create call request)
app.post('/', async (c) => {
  try {
    const { streamerId, viewerId, ratePerMinute } = await c.req.json();

    if (!streamerId || !viewerId || !ratePerMinute) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const db = c.env.DB;
    const callId = generateId();
    const roomId = `room_${callId}`;

    await db.prepare(`
      INSERT INTO calls (id, streamer_id, viewer_id, room_id, status, rate_per_minute, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).bind(callId, streamerId, viewerId, roomId, ratePerMinute, Date.now()).run();

    return c.json({
      success: true,
      call: {
        id: callId,
        streamerId,
        viewerId,
        roomId,
        status: 'pending',
        ratePerMinute
      }
    }, 201);

  } catch (error: any) {
    console.error('Create call error:', error);
    return c.json({ error: 'Erro ao criar chamada' }, 500);
  }
});

// GET /api/calls/:id
app.get('/:id', async (c) => {
  try {
    const callId = c.req.param('id');
    const db = c.env.DB;

    const call = await db.prepare(`
      SELECT c.*,
             s.name as streamer_name,
             v.name as viewer_name
      FROM calls c
      JOIN users s ON s.id = c.streamer_id
      JOIN users v ON v.id = c.viewer_id
      WHERE c.id = ?
    `).bind(callId).first();

    if (!call) {
      return c.json({ error: 'Chamada não encontrada' }, 404);
    }

    return c.json({ success: true, call });

  } catch (error: any) {
    console.error('Get call error:', error);
    return c.json({ error: 'Erro ao buscar chamada' }, 500);
  }
});

// PATCH /api/calls/:id/start
app.patch('/:id/start', async (c) => {
  try {
    const callId = c.req.param('id');
    const db = c.env.DB;

    await db.prepare(`
      UPDATE calls
      SET status = 'active', started_at = ?
      WHERE id = ? AND status = 'pending'
    `).bind(Date.now(), callId).run();

    return c.json({ success: true, message: 'Chamada iniciada' });

  } catch (error: any) {
    console.error('Start call error:', error);
    return c.json({ error: 'Erro ao iniciar chamada' }, 500);
  }
});

// PATCH /api/calls/:id/end
app.patch('/:id/end', async (c) => {
  try {
    const callId = c.req.param('id');
    const db = c.env.DB;

    // Get call data
    const call = await db.prepare(`
      SELECT started_at, rate_per_minute, viewer_id, streamer_id
      FROM calls
      WHERE id = ? AND status = 'active'
    `).bind(callId).first();

    if (!call) {
      return c.json({ error: 'Chamada não encontrada ou não está ativa' }, 404);
    }

    const now = Date.now();
    const duration = Math.floor((now - call.started_at) / 1000); // seconds
    const minutes = Math.ceil(duration / 60);
    const totalCost = minutes * call.rate_per_minute;

    // Update call
    await db.prepare(`
      UPDATE calls
      SET status = 'ended', ended_at = ?, duration = ?, total_cost = ?
      WHERE id = ?
    `).bind(now, duration, totalCost, callId).run();

    // Debit viewer wallet
    await db.prepare(`
      UPDATE wallets
      SET balance = balance - ?
      WHERE user_id = ?
    `).bind(totalCost, call.viewer_id).run();

    // Credit streamer wallet
    await db.prepare(`
      UPDATE wallets
      SET balance = balance + ?
      WHERE user_id = ?
    `).bind(totalCost, call.streamer_id).run();

    return c.json({
      success: true,
      message: 'Chamada finalizada',
      duration,
      totalCost
    });

  } catch (error: any) {
    console.error('End call error:', error);
    return c.json({ error: 'Erro ao finalizar chamada' }, 500);
  }
});

// GET /api/calls (list calls)
app.get('/', async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.req.query('userId');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '20');

    let query = `
      SELECT c.*,
             s.name as streamer_name,
             v.name as viewer_name
      FROM calls c
      JOIN users s ON s.id = c.streamer_id
      JOIN users v ON v.id = c.viewer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      query += ` AND (c.streamer_id = ? OR c.viewer_id = ?)`;
      params.push(userId, userId);
    }

    if (status) {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC LIMIT ?`;
    params.push(limit);

    const calls = await db.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      calls: calls.results || []
    });

  } catch (error: any) {
    console.error('List calls error:', error);
    return c.json({ error: 'Erro ao listar chamadas' }, 500);
  }
});

export default app;
