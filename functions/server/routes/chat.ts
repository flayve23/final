// functions/server/routes/chat.ts
// Sistema de Chat em Tempo Real - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// TIPOS
// ===========================

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  message_type: 'text' | 'gif' | 'sticker' | 'system';
  metadata?: any;
  is_deleted: boolean;
  created_at: number;
}

// ===========================
// CRIAR ROOM DE CHAT (quando call inicia)
// ===========================

app.post('/api/chat/rooms', async (c) => {
  try {
    const { call_id } = await c.req.json();
    
    if (!call_id) {
      return c.json({ error: 'call_id é obrigatório' }, 400);
    }

    // Verificar se call existe
    const call = await c.env.DB.prepare(`
      SELECT id FROM calls WHERE id = ?
    `).bind(call_id).first();

    if (!call) {
      return c.json({ error: 'Chamada não encontrada' }, 404);
    }

    // Verificar se já existe room
    const existingRoom = await c.env.DB.prepare(`
      SELECT id FROM chat_rooms WHERE call_id = ?
    `).bind(call_id).first();

    if (existingRoom) {
      return c.json({ room_id: existingRoom.id });
    }

    // Criar nova room
    const roomId = `room_${call_id}_${Date.now()}`;
    
    await c.env.DB.prepare(`
      INSERT INTO chat_rooms (id, call_id) VALUES (?, ?)
    `).bind(roomId, call_id).run();

    return c.json({ room_id: roomId });

  } catch (error) {
    console.error('Erro ao criar room:', error);
    return c.json({ error: 'Erro ao criar room de chat' }, 500);
  }
});

// ===========================
// ENVIAR MENSAGEM
// ===========================

app.post('/api/chat/messages', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const { room_id, message, message_type = 'text', metadata } = await c.req.json();

    if (!room_id || !message) {
      return c.json({ error: 'room_id e message são obrigatórios' }, 400);
    }

    // Validar room existe
    const room = await c.env.DB.prepare(`
      SELECT id, call_id FROM chat_rooms WHERE id = ?
    `).bind(room_id).first();

    if (!room) {
      return c.json({ error: 'Room não encontrada' }, 404);
    }

    // Validar usuário faz parte da chamada
    const call = await c.env.DB.prepare(`
      SELECT viewer_id, streamer_id FROM calls WHERE id = ?
    `).bind(room.call_id).first();

    if (!call || (call.viewer_id !== userId && call.streamer_id !== userId)) {
      return c.json({ error: 'Você não faz parte desta chamada' }, 403);
    }

    // Validar mensagem (máx 500 caracteres)
    if (message.length > 500) {
      return c.json({ error: 'Mensagem muito longa (máx 500 caracteres)' }, 400);
    }

    // Buscar dados do usuário
    const user = await c.env.DB.prepare(`
      SELECT display_name, avatar_url FROM users WHERE id = ?
    `).bind(userId).first();

    // Criar mensagem
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(`
      INSERT INTO chat_messages (
        id, room_id, user_id, message, message_type, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      room_id,
      userId,
      message,
      message_type,
      metadata ? JSON.stringify(metadata) : null,
      timestamp
    ).run();

    // Retornar mensagem completa
    const fullMessage: ChatMessage = {
      id: messageId,
      room_id,
      user_id: userId,
      user_name: user?.display_name || 'Usuário',
      user_avatar: user?.avatar_url || '',
      message,
      message_type,
      metadata: metadata || null,
      is_deleted: false,
      created_at: timestamp
    };

    // TODO: Enviar via WebSocket/SSE para outros participantes
    // Broadcast via Durable Objects ou Workers KV

    return c.json({ message: fullMessage });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return c.json({ error: 'Erro ao enviar mensagem' }, 500);
  }
});

// ===========================
// LISTAR MENSAGENS
// ===========================

app.get('/api/chat/rooms/:roomId/messages', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const roomId = c.req.param('roomId');
    const limit = parseInt(c.req.query('limit') || '50');
    const before = c.req.query('before'); // timestamp para paginação

    // Validar room e permissão
    const room = await c.env.DB.prepare(`
      SELECT cr.id, cr.call_id, c.viewer_id, c.streamer_id
      FROM chat_rooms cr
      JOIN calls c ON cr.call_id = c.id
      WHERE cr.id = ?
    `).bind(roomId).first();

    if (!room) {
      return c.json({ error: 'Room não encontrada' }, 404);
    }

    if (room.viewer_id !== userId && room.streamer_id !== userId) {
      return c.json({ error: 'Você não faz parte desta chamada' }, 403);
    }

    // Buscar mensagens
    let query = `
      SELECT 
        cm.id,
        cm.room_id,
        cm.user_id,
        cm.message,
        cm.message_type,
        cm.metadata,
        cm.is_deleted,
        cm.created_at,
        u.display_name as user_name,
        u.avatar_url as user_avatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.room_id = ? AND cm.is_deleted = 0
    `;

    const params: any[] = [roomId];

    if (before) {
      query += ` AND cm.created_at < ?`;
      params.push(before);
    }

    query += ` ORDER BY cm.created_at DESC LIMIT ?`;
    params.push(limit);

    const messages = await c.env.DB.prepare(query).bind(...params).all();

    // Reverter ordem (mais antigas primeiro)
    const formattedMessages = (messages.results || []).reverse().map((msg: any) => ({
      id: msg.id,
      room_id: msg.room_id,
      user_id: msg.user_id,
      user_name: msg.user_name,
      user_avatar: msg.user_avatar,
      message: msg.message,
      message_type: msg.message_type,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      is_deleted: Boolean(msg.is_deleted),
      created_at: msg.created_at
    }));

    return c.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    return c.json({ error: 'Erro ao listar mensagens' }, 500);
  }
});

// ===========================
// DELETAR MENSAGEM
// ===========================

app.delete('/api/chat/messages/:messageId', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const messageId = c.req.param('messageId');

    // Buscar mensagem
    const message = await c.env.DB.prepare(`
      SELECT user_id FROM chat_messages WHERE id = ?
    `).bind(messageId).first();

    if (!message) {
      return c.json({ error: 'Mensagem não encontrada' }, 404);
    }

    // Validar é o autor ou admin
    const user = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(userId).first();

    if (message.user_id !== userId && user?.role !== 'admin') {
      return c.json({ error: 'Sem permissão para deletar' }, 403);
    }

    // Soft delete
    await c.env.DB.prepare(`
      UPDATE chat_messages SET is_deleted = 1 WHERE id = ?
    `).bind(messageId).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    return c.json({ error: 'Erro ao deletar mensagem' }, 500);
  }
});

// ===========================
// WEBSOCKET/SSE (para tempo real)
// ===========================

// Nota: Para WebSocket real, usar Durable Objects
// Este é um endpoint de polling simples como fallback

app.get('/api/chat/rooms/:roomId/poll', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const roomId = c.req.param('roomId');
    const since = c.req.query('since'); // timestamp

    if (!since) {
      return c.json({ messages: [] });
    }

    // Validar permissão
    const room = await c.env.DB.prepare(`
      SELECT cr.id, c.viewer_id, c.streamer_id
      FROM chat_rooms cr
      JOIN calls c ON cr.call_id = c.id
      WHERE cr.id = ?
    `).bind(roomId).first();

    if (!room || (room.viewer_id !== userId && room.streamer_id !== userId)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }

    // Buscar mensagens novas
    const messages = await c.env.DB.prepare(`
      SELECT 
        cm.id,
        cm.room_id,
        cm.user_id,
        cm.message,
        cm.message_type,
        cm.metadata,
        cm.created_at,
        u.display_name as user_name,
        u.avatar_url as user_avatar
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.room_id = ? AND cm.created_at > ? AND cm.is_deleted = 0
      ORDER BY cm.created_at ASC
      LIMIT 50
    `).bind(roomId, since).all();

    const formattedMessages = (messages.results || []).map((msg: any) => ({
      id: msg.id,
      room_id: msg.room_id,
      user_id: msg.user_id,
      user_name: msg.user_name,
      user_avatar: msg.user_avatar,
      message: msg.message,
      message_type: msg.message_type,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      is_deleted: false,
      created_at: msg.created_at
    }));

    return c.json({ messages: formattedMessages });

  } catch (error) {
    console.error('Erro ao fazer poll:', error);
    return c.json({ error: 'Erro ao fazer poll' }, 500);
  }
});

export default app;
