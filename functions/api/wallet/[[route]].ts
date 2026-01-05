import { Hono } from 'hono';

const app = new Hono();

function generateId() {
  return crypto.randomUUID();
}

// GET /api/wallet/:userId
app.get('/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    const wallet = await db.prepare(`
      SELECT id, user_id, balance, created_at, updated_at
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

// GET /api/wallet/:userId/transactions
app.get('/:userId/transactions', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;
    const limit = parseInt(c.req.query('limit') || '50');
    const type = c.req.query('type');

    // Get wallet ID
    const wallet = await db.prepare(`
      SELECT id FROM wallets WHERE user_id = ?
    `).bind(userId).first();

    if (!wallet) {
      return c.json({ error: 'Carteira não encontrada' }, 404);
    }

    let query = `
      SELECT id, type, amount, status, description, created_at
      FROM wallet_transactions
      WHERE wallet_id = ?
    `;
    const params: any[] = [wallet.id];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const transactions = await db.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      transactions: transactions.results || []
    });

  } catch (error: any) {
    console.error('Get transactions error:', error);
    return c.json({ error: 'Erro ao buscar transações' }, 500);
  }
});

// POST /api/wallet/:userId/deposit
app.post('/:userId/deposit', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { amount, paymentMethod } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Valor inválido' }, 400);
    }

    const db = c.env.DB;

    // Get wallet
    const wallet = await db.prepare(`
      SELECT id, balance FROM wallets WHERE user_id = ?
    `).bind(userId).first();

    if (!wallet) {
      return c.json({ error: 'Carteira não encontrada' }, 404);
    }

    // Create transaction
    const transactionId = generateId();
    await db.prepare(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, status, description, created_at)
      VALUES (?, ?, 'deposit', ?, 'completed', ?, ?)
    `).bind(
      transactionId,
      wallet.id,
      amount,
      `Depósito via ${paymentMethod || 'Mercado Pago'}`,
      Date.now()
    ).run();

    // Update wallet balance
    await db.prepare(`
      UPDATE wallets
      SET balance = balance + ?, updated_at = ?
      WHERE id = ?
    `).bind(amount, Date.now(), wallet.id).run();

    return c.json({
      success: true,
      message: 'Depósito realizado com sucesso',
      transaction: {
        id: transactionId,
        amount,
        newBalance: wallet.balance + amount
      }
    }, 201);

  } catch (error: any) {
    console.error('Deposit error:', error);
    return c.json({ error: 'Erro ao realizar depósito' }, 500);
  }
});

// POST /api/wallet/:userId/withdraw
app.post('/:userId/withdraw', async (c) => {
  try {
    const userId = c.req.param('userId');
    const { amount, pixKey } = await c.req.json();

    if (!amount || amount <= 0) {
      return c.json({ error: 'Valor inválido' }, 400);
    }

    if (!pixKey) {
      return c.json({ error: 'Chave PIX obrigatória' }, 400);
    }

    const db = c.env.DB;

    // Get wallet
    const wallet = await db.prepare(`
      SELECT id, balance FROM wallets WHERE user_id = ?
    `).bind(userId).first();

    if (!wallet) {
      return c.json({ error: 'Carteira não encontrada' }, 404);
    }

    if (wallet.balance < amount) {
      return c.json({ error: 'Saldo insuficiente' }, 400);
    }

    // Check withdrawal limits
    const user = await db.prepare(`
      SELECT withdrawal_limit_daily, withdrawal_limit_per_transaction
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (user && amount > user.withdrawal_limit_per_transaction) {
      return c.json({ 
        error: `Limite por transação: R$ ${user.withdrawal_limit_per_transaction}` 
      }, 400);
    }

    // Create transaction
    const transactionId = generateId();
    await db.prepare(`
      INSERT INTO wallet_transactions (id, wallet_id, type, amount, status, description, created_at)
      VALUES (?, ?, 'withdrawal', ?, 'pending', ?, ?)
    `).bind(
      transactionId,
      wallet.id,
      amount,
      `Saque para PIX: ${pixKey}`,
      Date.now()
    ).run();

    // Deduct from balance
    await db.prepare(`
      UPDATE wallets
      SET balance = balance - ?, updated_at = ?
      WHERE id = ?
    `).bind(amount, Date.now(), wallet.id).run();

    return c.json({
      success: true,
      message: 'Saque solicitado com sucesso',
      transaction: {
        id: transactionId,
        amount,
        status: 'pending',
        estimatedTime: '1-3 dias úteis'
      }
    }, 201);

  } catch (error: any) {
    console.error('Withdraw error:', error);
    return c.json({ error: 'Erro ao solicitar saque' }, 500);
  }
});

// GET /api/wallet/:userId/balance
app.get('/:userId/balance', async (c) => {
  try {
    const userId = c.req.param('userId');
    const db = c.env.DB;

    const wallet = await db.prepare(`
      SELECT balance FROM wallets WHERE user_id = ?
    `).bind(userId).first();

    if (!wallet) {
      return c.json({ error: 'Carteira não encontrada' }, 404);
    }

    return c.json({
      success: true,
      balance: wallet.balance
    });

  } catch (error: any) {
    console.error('Get balance error:', error);
    return c.json({ error: 'Erro ao buscar saldo' }, 500);
  }
});

export default app;
