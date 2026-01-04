// functions/server/routes/gifts.ts
// Sistema de Presentes Virtuais - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// LISTAR CATÁLOGO DE PRESENTES
// ===========================

app.get('/api/gifts/catalog', async (c) => {
  try {
    const gifts = await c.env.DB.prepare(`
      SELECT id, name, description, image_url, price, rarity
      FROM gift_catalog
      WHERE is_active = 1
      ORDER BY price ASC
    `).all();

    return c.json({ gifts: gifts.results || [] });

  } catch (error) {
    console.error('Erro ao listar presentes:', error);
    return c.json({ error: 'Erro ao listar presentes' }, 500);
  }
});

// ===========================
// ENVIAR PRESENTE
// ===========================

app.post('/api/gifts/send', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const { receiver_id, gift_id, call_id, message } = await c.req.json();

    if (!receiver_id || !gift_id) {
      return c.json({ error: 'receiver_id e gift_id são obrigatórios' }, 400);
    }

    // Buscar presente
    const gift = await c.env.DB.prepare(`
      SELECT id, name, price, is_active FROM gift_catalog WHERE id = ?
    `).bind(gift_id).first();

    if (!gift || !gift.is_active) {
      return c.json({ error: 'Presente não encontrado ou inativo' }, 404);
    }

    // Buscar receiver
    const receiver = await c.env.DB.prepare(`
      SELECT id, role, display_name FROM users WHERE id = ?
    `).bind(receiver_id).first();

    if (!receiver) {
      return c.json({ error: 'Destinatário não encontrado' }, 404);
    }

    if (receiver.role !== 'streamer') {
      return c.json({ error: 'Você só pode enviar presentes para streamers' }, 400);
    }

    // Validar call_id se fornecido
    if (call_id) {
      const call = await c.env.DB.prepare(`
        SELECT id, viewer_id, streamer_id, status
        FROM calls WHERE id = ?
      `).bind(call_id).first();

      if (!call) {
        return c.json({ error: 'Chamada não encontrada' }, 404);
      }

      if (call.viewer_id !== userId || call.streamer_id !== receiver_id) {
        return c.json({ error: 'Chamada inválida para este presente' }, 400);
      }

      if (call.status !== 'active') {
        return c.json({ error: 'Chamada não está ativa' }, 400);
      }
    }

    // Buscar wallet do sender
    const senderWallet = await c.env.DB.prepare(`
      SELECT balance FROM wallets WHERE user_id = ?
    `).bind(userId).first();

    if (!senderWallet || senderWallet.balance < gift.price) {
      return c.json({ error: 'Saldo insuficiente' }, 400);
    }

    // Criar transação (dentro de transação SQL)
    const transactionId = `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // 1. Debitar do sender
    await c.env.DB.prepare(`
      UPDATE wallets SET balance = balance - ? WHERE user_id = ?
    `).bind(gift.price, userId).run();

    await c.env.DB.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, transaction_type, amount, status, description, created_at
      ) VALUES (?, ?, 'gift_sent', ?, 'completed', ?, ?)
    `).bind(
      `${transactionId}_sender`,
      userId,
      -gift.price,
      `Presente: ${gift.name} para ${receiver.display_name}`,
      timestamp
    ).run();

    // 2. Creditar ao receiver (75% - descontando 25% de taxa)
    const receiverAmount = gift.price * 0.75;

    await c.env.DB.prepare(`
      UPDATE wallets SET balance = balance + ? WHERE user_id = ?
    `).bind(receiverAmount, receiver_id).run();

    await c.env.DB.prepare(`
      INSERT INTO wallet_transactions (
        id, user_id, transaction_type, amount, status, description, created_at
      ) VALUES (?, ?, 'gift_received', ?, 'completed', ?, ?)
    `).bind(
      `${transactionId}_receiver`,
      receiver_id,
      receiverAmount,
      `Presente recebido: ${gift.name}`,
      timestamp
    ).run();

    // 3. Registrar presente
    await c.env.DB.prepare(`
      INSERT INTO gift_transactions (
        id, sender_id, receiver_id, gift_id, call_id, amount, message, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)
    `).bind(
      transactionId,
      userId,
      receiver_id,
      gift_id,
      call_id || null,
      gift.price,
      message || null,
      timestamp
    ).run();

    // 4. Criar notificação
    await c.env.DB.prepare(`
      INSERT INTO notifications (
        id, user_id, type, title, message, data, created_at
      ) VALUES (?, ?, 'gift_received', ?, ?, ?, ?)
    `).bind(
      `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      receiver_id,
      'Você recebeu um presente! 🎁',
      `${gift.name} de um admirador${message ? ': "' + message + '"' : ''}`,
      JSON.stringify({ gift_id, transaction_id: transactionId }),
      timestamp
    ).run();

    return c.json({
      success: true,
      transaction_id: transactionId,
      amount_paid: gift.price,
      amount_received: receiverAmount
    });

  } catch (error) {
    console.error('Erro ao enviar presente:', error);
    return c.json({ error: 'Erro ao enviar presente' }, 500);
  }
});

// ===========================
// HISTÓRICO DE PRESENTES ENVIADOS
// ===========================

app.get('/api/gifts/sent', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const gifts = await c.env.DB.prepare(`
      SELECT 
        gt.id,
        gt.amount,
        gt.message,
        gt.created_at,
        u.display_name as receiver_name,
        u.avatar_url as receiver_avatar,
        g.name as gift_name,
        g.image_url as gift_image
      FROM gift_transactions gt
      JOIN users u ON gt.receiver_id = u.id
      JOIN gift_catalog g ON gt.gift_id = g.id
      WHERE gt.sender_id = ?
      ORDER BY gt.created_at DESC
      LIMIT 50
    `).bind(userId).all();

    return c.json({ gifts: gifts.results || [] });

  } catch (error) {
    console.error('Erro ao listar presentes enviados:', error);
    return c.json({ error: 'Erro ao listar presentes enviados' }, 500);
  }
});

// ===========================
// HISTÓRICO DE PRESENTES RECEBIDOS
// ===========================

app.get('/api/gifts/received', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const gifts = await c.env.DB.prepare(`
      SELECT 
        gt.id,
        gt.amount,
        gt.message,
        gt.created_at,
        g.name as gift_name,
        g.image_url as gift_image,
        g.rarity
      FROM gift_transactions gt
      JOIN gift_catalog g ON gt.gift_id = g.id
      WHERE gt.receiver_id = ?
      ORDER BY gt.created_at DESC
      LIMIT 50
    `).bind(userId).all();

    return c.json({ gifts: gifts.results || [] });

  } catch (error) {
    console.error('Erro ao listar presentes recebidos:', error);
    return c.json({ error: 'Erro ao listar presentes recebidos' }, 500);
  }
});

// ===========================
// ESTATÍSTICAS DE PRESENTES (para streamer)
// ===========================

app.get('/api/gifts/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    // Total recebido
    const totalResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_gifts,
        SUM(amount) as total_amount
      FROM gift_transactions
      WHERE receiver_id = ?
    `).bind(userId).first();

    // Top presentes
    const topGifts = await c.env.DB.prepare(`
      SELECT 
        g.name,
        g.image_url,
        COUNT(*) as count,
        SUM(gt.amount) as total_value
      FROM gift_transactions gt
      JOIN gift_catalog g ON gt.gift_id = g.id
      WHERE gt.receiver_id = ?
      GROUP BY gt.gift_id
      ORDER BY count DESC
      LIMIT 5
    `).bind(userId).all();

    // Presentes esta semana
    const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const weekResult = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total
      FROM gift_transactions
      WHERE receiver_id = ? AND created_at > ?
    `).bind(userId, weekAgo).first();

    return c.json({
      total_gifts: totalResult?.total_gifts || 0,
      total_amount: totalResult?.total_amount || 0,
      top_gifts: topGifts.results || [],
      this_week: {
        count: weekResult?.count || 0,
        total: weekResult?.total || 0
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500);
  }
});

export default app;
