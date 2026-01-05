import { Hono } from 'hono';

const app = new Hono();

function generateId() {
  return crypto.randomUUID();
}

// POST /api/chat/rooms (create chat room)
app.post('/rooms', async (c) => {
  try {
    const { callId } = await c.req.json();

    if (!callId) {
      return c.json({ error: 'Call ID obrigatório' }, 400);
    }

    const db = c.env.DB;
    const roomId = generateId();

    await db.prepare(`
      INSERT INTO chat_rooms (id, call_id, created_at)
      VALUES (?, ?, ?)
    `).bind(roomId, callId, Date.now()).run();

    return c.json({
      success: true,
      room: {
        id: roomId,
        callId
      }
    }, 201);

  } catch (error: any) {
    console.error('Create chat room error:', error);
    return c.json({ error: 'Erro ao criar sala de chat' }, 500);
  }
});

// POST /api/chat/messages (send message)
app.post('/messages', async (c) => {
  try {
    const { roomId, userId, message } = await c.req.json();

    if (!roomId || !userId || !message) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const db = c.env.DB;
    const messageId = generateId();

    await db.prepare(`
      INSERT INTO chat_messages (id, room_id, user_id, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(messageId, roomId, userId, message, Date.now()).run();

    return c.json({
      success: true,
      message: {
        id: messageId,
        roomId,
        userId,
        message,
        createdAt: Date.now()
      }
    }, 201);

  } catch (error: any) {
    console.error('Send message error:', error);
    return c.json({ error: 'Erro ao enviar mensagem' }, 500);
  }
});

// GET /api/chat/rooms/:roomId/messages
app.get('/rooms/:roomId/messages', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '100');
    const before = c.req.query('before'); // timestamp for pagination

    let query = `
      SELECT cm.*,
             u.name as user_name
      FROM chat_messages cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.room_id = ?
    `;
    const params: any[] = [roomId];

    if (before) {
      query += ` AND cm.created_at < ?`;
      params.push(parseInt(before));
    }

    query += ` ORDER BY cm.created_at DESC LIMIT ?`;
    params.push(limit);

    const messages = await db.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      messages: messages.results?.reverse() || [] // Reverse to show oldest first
    });

  } catch (error: any) {
    console.error('Get messages error:', error);
    return c.json({ error: 'Erro ao buscar mensagens' }, 500);
  }
});

// GET /api/chat/rooms/:callId
app.get('/rooms/:callId', async (c) => {
  try {
    const callId = c.req.param('callId');
    const db = c.env.DB;

    const room = await db.prepare(`
      SELECT id, call_id, created_at
      FROM chat_rooms
      WHERE call_id = ?
    `).bind(callId).first();

    if (!room) {
      return c.json({ error: 'Sala de chat não encontrada' }, 404);
    }

    return c.json({ success: true, room });

  } catch (error: any) {
    console.error('Get chat room error:', error);
    return c.json({ error: 'Erro ao buscar sala de chat' }, 500);
  }
});

export default app;
