// functions/server/routes/alerts.ts
// Sistema de Alertas de Streamer Online - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// ATIVAR ALERTA PARA STREAMER
// ===========================

app.post('/api/alerts/subscribe', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const { streamer_id } = await c.req.json();

    if (!streamer_id) {
      return c.json({ error: 'streamer_id é obrigatório' }, 400);
    }

    // Validar streamer existe
    const streamer = await c.env.DB.prepare(`
      SELECT id, role FROM users WHERE id = ?
    `).bind(streamer_id).first();

    if (!streamer || streamer.role !== 'streamer') {
      return c.json({ error: 'Streamer não encontrado' }, 404);
    }

    // Verificar se já existe
    const existing = await c.env.DB.prepare(`
      SELECT id, is_active FROM online_alerts
      WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamer_id).first();

    if (existing) {
      if (existing.is_active) {
        return c.json({ message: 'Alerta já está ativo' });
      }

      // Reativar
      await c.env.DB.prepare(`
        UPDATE online_alerts SET is_active = 1 WHERE id = ?
      `).bind(existing.id).run();

      return c.json({ success: true, action: 'reactivated' });
    }

    // Criar novo
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await c.env.DB.prepare(`
      INSERT INTO online_alerts (id, viewer_id, streamer_id)
      VALUES (?, ?, ?)
    `).bind(alertId, userId, streamer_id).run();

    return c.json({ success: true, action: 'created', alert_id: alertId });

  } catch (error) {
    console.error('Erro ao ativar alerta:', error);
    return c.json({ error: 'Erro ao ativar alerta' }, 500);
  }
});

// ===========================
// DESATIVAR ALERTA
// ===========================

app.post('/api/alerts/unsubscribe', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const { streamer_id } = await c.req.json();

    if (!streamer_id) {
      return c.json({ error: 'streamer_id é obrigatório' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE online_alerts
      SET is_active = 0
      WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamer_id).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('Erro ao desativar alerta:', error);
    return c.json({ error: 'Erro ao desativar alerta' }, 500);
  }
});

// ===========================
// LISTAR ALERTAS DO USUÁRIO
// ===========================

app.get('/api/alerts/my-alerts', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const alerts = await c.env.DB.prepare(`
      SELECT 
        oa.id,
        oa.streamer_id,
        oa.is_active,
        oa.last_notified_at,
        u.display_name as streamer_name,
        u.avatar_url as streamer_avatar,
        u.is_online
      FROM online_alerts oa
      JOIN users u ON oa.streamer_id = u.id
      WHERE oa.viewer_id = ?
      ORDER BY u.display_name
    `).bind(userId).all();

    return c.json({ alerts: alerts.results || [] });

  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    return c.json({ error: 'Erro ao listar alertas' }, 500);
  }
});

// ===========================
// VERIFICAR SE TEM ALERTA ATIVO
// ===========================

app.get('/api/alerts/check/:streamerId', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const streamerId = c.req.param('streamerId');

    const alert = await c.env.DB.prepare(`
      SELECT is_active FROM online_alerts
      WHERE viewer_id = ? AND streamer_id = ?
    `).bind(userId, streamerId).first();

    return c.json({
      has_alert: Boolean(alert),
      is_active: alert?.is_active || false
    });

  } catch (error) {
    console.error('Erro ao verificar alerta:', error);
    return c.json({ error: 'Erro ao verificar alerta' }, 500);
  }
});

// ===========================
// CRON JOB: Notificar quando streamer fica online
// ===========================

app.get('/api/alerts/cron/notify-online', async (c) => {
  try {
    // Buscar streamers que acabaram de ficar online (últimos 5 minutos)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

    const recentlyOnline = await c.env.DB.prepare(`
      SELECT id, display_name, avatar_url
      FROM users
      WHERE role = 'streamer'
        AND is_online = 1
        AND last_online_at > ?
    `).bind(fiveMinutesAgo).all();

    let notificationsSent = 0;

    for (const streamer of (recentlyOnline.results || [])) {
      // Buscar viewers com alerta ativo
      const alerts = await c.env.DB.prepare(`
        SELECT id, viewer_id, last_notified_at
        FROM online_alerts
        WHERE streamer_id = ? AND is_active = 1
      `).bind(streamer.id).all();

      const timestamp = Math.floor(Date.now() / 1000);

      for (const alert of (alerts.results || [])) {
        // Não notificar se já notificou nos últimos 30 minutos
        if (alert.last_notified_at && (timestamp - alert.last_notified_at) < 1800) {
          continue;
        }

        // Criar notificação
        await c.env.DB.prepare(`
          INSERT INTO notifications (
            id, user_id, type, title, message, data, created_at
          ) VALUES (?, ?, 'streamer_online', ?, ?, ?, ?)
        `).bind(
          `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          alert.viewer_id,
          `${streamer.display_name} está online! 🟢`,
          `Entre agora para uma chamada`,
          JSON.stringify({ streamer_id: streamer.id }),
          timestamp
        ).run();

        // Atualizar last_notified_at
        await c.env.DB.prepare(`
          UPDATE online_alerts
          SET last_notified_at = ?
          WHERE id = ?
        `).bind(timestamp, alert.id).run();

        notificationsSent++;

        // TODO: Enviar push notification real
        // await sendPushNotification(alert.viewer_id, { ... });
      }
    }

    return c.json({
      success: true,
      streamers_checked: recentlyOnline.results?.length || 0,
      notifications_sent: notificationsSent
    });

  } catch (error) {
    console.error('Erro no cron de alertas:', error);
    return c.json({ error: 'Erro no cron' }, 500);
  }
});

export default app;
