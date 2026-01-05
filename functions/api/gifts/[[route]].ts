import { Hono } from 'hono';

const app = new Hono();

function generateId() {
  return crypto.randomUUID();
}

// GET /api/gifts/catalog
app.get('/catalog', async (c) => {
  try {
    const db = c.env.DB;

    const gifts = await db.prepare(`
      SELECT id, name, description, price, icon, is_active
      FROM gift_catalog
      WHERE is_active = 1
      ORDER BY price ASC
    `).all();

    return c.json({
      success: true,
      gifts: gifts.results || []
    });

  } catch (error: any) {
    console.error('Get gift catalog error:', error);
    return c.json({ error: 'Erro ao buscar catálogo de presentes' }, 500);
  }
});

// POST /api/gifts/send
app.post('/send', async (c) => {
  try {
    const { senderId, receiverId, giftId, message } = await c.req.json();

    if (!senderId || !receiverId || !giftId) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const db = c.env.DB;

    // Get gift price
    const gift = await db.prepare(`
      SELECT price, name
      FROM gift_catalog
      WHERE id = ? AND is_active = 1
    `).bind(giftId).first();

    if (!gift) {
      return c.json({ error: 'Presente não encontrado' }, 404);
    }

    // Check sender balance
    const senderWallet = await db.prepare(`
      SELECT balance
      FROM wallets
      WHERE user_id = ?
    `).bind(senderId).first();

    if (!senderWallet || senderWallet.balance < gift.price) {
      return c.json({ error: 'Saldo insuficiente' }, 400);
    }

    // Create transaction
    const transactionId = generateId();
    await db.prepare(`
      INSERT INTO gift_transactions (id, sender_id, receiver_id, gift_id, amount, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(transactionId, senderId, receiverId, giftId, gift.price, message || null, Date.now()).run();

    // Debit sender
    await db.prepare(`
      UPDATE wallets
      SET balance = balance - ?
      WHERE user_id = ?
    `).bind(gift.price, senderId).run();

    // Credit receiver (80% of gift value, 20% platform fee)
    const receiverAmount = gift.price * 0.8;
    await db.prepare(`
      UPDATE wallets
      SET balance = balance + ?
      WHERE user_id = ?
    `).bind(receiverAmount, receiverId).run();

    // Create notification for receiver
    const notificationId = generateId();
    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, created_at)
      VALUES (?, ?, 'gift_received', 'Presente Recebido!', ?, ?)
    `).bind(
      notificationId,
      receiverId,
      `Você recebeu um presente: ${gift.name}`,
      Date.now()
    ).run();

    return c.json({
      success: true,
      message: 'Presente enviado com sucesso',
      transaction: {
        id: transactionId,
        giftName: gift.name,
        amount: gift.price
      }
    }, 201);

  } catch (error: any) {
    console.error('Send gift error:', error);
    return c.json({ error: 'Erro ao enviar presente' }, 500);
  }
});

// GET /api/gifts/received/:userId
app.get('/received/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '20');

    const gifts = await db.prepare(`
      SELECT gt.*,
             gc.name as gift_name,
             gc.icon as gift_icon,
             u.name as sender_name
      FROM gift_transactions gt
      JOIN gift_catalog gc ON gc.id = gt.gift_id
      JOIN users u ON u.id = gt.sender_id
      WHERE gt.receiver_id = ?
      ORDER BY gt.created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return c.json({
      success: true,
      gifts: gifts.results || []
    });

  } catch (error: any) {
    console.error('Get received gifts error:', error);
    return c.json({ error: 'Erro ao buscar presentes recebidos' }, 500);
  }
});

// GET /api/gifts/sent/:userId
app.get('/sent/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '20');

    const gifts = await db.prepare(`
      SELECT gt.*,
             gc.name as gift_name,
             gc.icon as gift_icon,
             u.name as receiver_name
      FROM gift_transactions gt
      JOIN gift_catalog gc ON gc.id = gt.gift_id
      JOIN users u ON u.id = gt.receiver_id
      WHERE gt.sender_id = ?
      ORDER BY gt.created_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return c.json({
      success: true,
      gifts: gifts.results || []
    });

  } catch (error: any) {
    console.error('Get sent gifts error:', error);
    return c.json({ error: 'Erro ao buscar presentes enviados' }, 500);
  }
});

export default app;
