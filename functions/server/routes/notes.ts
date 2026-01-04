// functions/server/routes/notes.ts
// Notas Privadas - FLAYVE

import { Hono } from 'hono';
const app = new Hono();

app.post('/api/notes', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    const { streamer_id, note } = await c.req.json();
    if (!streamer_id || !note) {
      return c.json({ error: 'streamer_id e note são obrigatórios' }, 400);
    }

    const existing = await c.env.DB.prepare(`
      SELECT id FROM private_notes WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamer_id).first();

    const timestamp = Math.floor(Date.now() / 1000);

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE private_notes SET note = ?, updated_at = ? WHERE id = ?
      `).bind(note, timestamp, existing.id).run();
      return c.json({ success: true, action: 'updated' });
    }

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await c.env.DB.prepare(`
      INSERT INTO private_notes (id, viewer_id, streamer_id, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(noteId, userId, streamer_id, note, timestamp, timestamp).run();

    return c.json({ success: true, action: 'created', note_id: noteId });
  } catch (error) {
    return c.json({ error: 'Erro ao salvar nota' }, 500);
  }
});

app.get('/api/notes/streamer/:streamerId', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    const streamerId = c.req.param('streamerId');
    const note = await c.env.DB.prepare(`
      SELECT note, created_at, updated_at FROM private_notes
      WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamerId).first();

    return c.json({ note: note || null });
  } catch (error) {
    return c.json({ error: 'Erro ao buscar nota' }, 500);
  }
});

app.delete('/api/notes/streamer/:streamerId', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) return c.json({ error: 'Não autenticado' }, 401);

    const streamerId = c.req.param('streamerId');
    await c.env.DB.prepare(`
      DELETE FROM private_notes WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamerId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Erro ao deletar nota' }, 500);
  }
});

export default app;
