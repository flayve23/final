// functions/server/routes/search.ts
// Busca Avançada - FLAYVE

import { Hono } from 'hono';
const app = new Hono();

app.post('/api/admin/search', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    // Verificar se é admin
    const user = await c.env.DB.prepare(`SELECT role FROM users WHERE id = ?`).bind(userId).first();
    if (user?.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);

    const { type, query, filters } = await c.req.json();
    const limit = parseInt(filters?.limit || '50');

    if (type === 'users') {
      let sql = `SELECT id, email, display_name, role, kyc_status, is_online, created_at FROM users WHERE 1=1`;
      const params: any[] = [];

      if (query) {
        sql += ` AND (email LIKE ? OR display_name LIKE ? OR cpf LIKE ?)`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.role) {
        sql += ` AND role = ?`;
        params.push(filters.role);
      }

      if (filters?.kyc_status) {
        sql += ` AND kyc_status = ?`;
        params.push(filters.kyc_status);
      }

      if (filters?.is_online !== undefined) {
        sql += ` AND is_online = ?`;
        params.push(filters.is_online ? 1 : 0);
      }

      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const results = await c.env.DB.prepare(sql).bind(...params).all();
      return c.json({ results: results.results || [], count: results.results?.length || 0 });
    }

    if (type === 'transactions') {
      let sql = `
        SELECT wt.id, wt.user_id, wt.transaction_type, wt.amount, wt.status, wt.description, wt.created_at,
               u.display_name, u.email
        FROM wallet_transactions wt
        JOIN users u ON wt.user_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (query) {
        sql += ` AND (wt.id LIKE ? OR u.email LIKE ? OR wt.description LIKE ?)`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.transaction_type) {
        sql += ` AND wt.transaction_type = ?`;
        params.push(filters.transaction_type);
      }

      if (filters?.status) {
        sql += ` AND wt.status = ?`;
        params.push(filters.status);
      }

      if (filters?.min_amount) {
        sql += ` AND ABS(wt.amount) >= ?`;
        params.push(filters.min_amount);
      }

      if (filters?.date_from) {
        sql += ` AND wt.created_at >= ?`;
        params.push(Math.floor(new Date(filters.date_from).getTime() / 1000));
      }

      sql += ` ORDER BY wt.created_at DESC LIMIT ?`;
      params.push(limit);

      const results = await c.env.DB.prepare(sql).bind(...params).all();
      return c.json({ results: results.results || [], count: results.results?.length || 0 });
    }

    if (type === 'calls') {
      let sql = `
        SELECT c.id, c.viewer_id, c.streamer_id, c.status, c.duration, c.total_amount, c.created_at,
               v.display_name as viewer_name, s.display_name as streamer_name
        FROM calls c
        JOIN users v ON c.viewer_id = v.id
        JOIN users s ON c.streamer_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (query) {
        sql += ` AND (c.id LIKE ? OR v.email LIKE ? OR s.email LIKE ?)`;
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.status) {
        sql += ` AND c.status = ?`;
        params.push(filters.status);
      }

      if (filters?.date_from) {
        sql += ` AND c.created_at >= ?`;
        params.push(Math.floor(new Date(filters.date_from).getTime() / 1000));
      }

      sql += ` ORDER BY c.created_at DESC LIMIT ?`;
      params.push(limit);

      const results = await c.env.DB.prepare(sql).bind(...params).all();
      return c.json({ results: results.results || [], count: results.results?.length || 0 });
    }

    return c.json({ error: 'Tipo de busca inválido' }, 400);

  } catch (error) {
    console.error('Erro na busca:', error);
    return c.json({ error: 'Erro ao realizar busca' }, 500);
  }
});

export default app;
