// functions/server/routes/affiliates.ts
// Programa de Afiliados - FLAYVE

import { Hono } from 'hono';
const app = new Hono();

const COMMISSION_RATE = 0.10; // 10% de comissão

app.post('/api/affiliates/register', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    const user = await c.env.DB.prepare(`SELECT id, role FROM users WHERE id = ?`).bind(userId).first();
    if (!user) return c.json({ error: 'Usuário não encontrado' }, 404);

    // Gerar código único
    const affiliateCode = `FL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    await c.env.DB.prepare(`
      INSERT INTO affiliates (id, user_id, affiliate_code, commission_rate, status)
      VALUES (?, ?, ?, ?, 'active')
    `).bind(`aff_${Date.now()}`, userId, affiliateCode, COMMISSION_RATE).run();

    return c.json({ success: true, affiliate_code: affiliateCode });
  } catch (error) {
    return c.json({ error: 'Erro ao registrar afiliado' }, 500);
  }
});

app.get('/api/affiliates/stats', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    const affiliate = await c.env.DB.prepare(`
      SELECT id, affiliate_code, total_referrals, total_earnings, commission_rate
      FROM affiliates WHERE user_id = ?
    `).bind(userId).first();

    if (!affiliate) return c.json({ error: 'Você não é um afiliado' }, 404);

    // Estatísticas recentes
    const monthAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recent = await c.env.DB.prepare(`
      SELECT COUNT(*) as count, SUM(commission_amount) as total
      FROM affiliate_commissions
      WHERE affiliate_id = ? AND created_at > ?
    `).bind(affiliate.id, monthAgo).first();

    return c.json({
      affiliate_code: affiliate.affiliate_code,
      total_referrals: affiliate.total_referrals || 0,
      total_earnings: affiliate.total_earnings || 0,
      commission_rate: affiliate.commission_rate,
      this_month: {
        referrals: recent?.count || 0,
        earnings: recent?.total || 0
      }
    });
  } catch (error) {
    return c.json({ error: 'Erro ao buscar estatísticas' }, 500);
  }
});

export default app;
