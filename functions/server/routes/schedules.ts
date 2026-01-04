// functions/server/routes/schedules.ts
// Sistema de Agendamento de Disponibilidade - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// CRIAR/ATUALIZAR HORÁRIO DA SEMANA
// ===========================

app.post('/api/schedules', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    // Validar é streamer
    const user = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(userId).first();

    if (user?.role !== 'streamer') {
      return c.json({ error: 'Apenas streamers podem definir horários' }, 403);
    }

    const { day_of_week, start_time, end_time } = await c.req.json();

    // Validar dados
    if (day_of_week < 0 || day_of_week > 6) {
      return c.json({ error: 'day_of_week deve ser entre 0 (domingo) e 6 (sábado)' }, 400);
    }

    if (!start_time || !end_time) {
      return c.json({ error: 'start_time e end_time são obrigatórios' }, 400);
    }

    // Validar formato HH:MM
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return c.json({ error: 'Horários devem estar no formato HH:MM (24h)' }, 400);
    }

    // Validar start < end
    if (start_time >= end_time) {
      return c.json({ error: 'Horário de início deve ser antes do fim' }, 400);
    }

    // Verificar se já existe
    const existing = await c.env.DB.prepare(`
      SELECT id FROM streamer_schedules
      WHERE streamer_id = ? AND day_of_week = ? AND is_active = 1
    `).bind(userId, day_of_week).first();

    if (existing) {
      // Atualizar
      await c.env.DB.prepare(`
        UPDATE streamer_schedules
        SET start_time = ?, end_time = ?
        WHERE id = ?
      `).bind(start_time, end_time, existing.id).run();

      return c.json({ success: true, action: 'updated', schedule_id: existing.id });
    } else {
      // Criar novo
      const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await c.env.DB.prepare(`
        INSERT INTO streamer_schedules (
          id, streamer_id, day_of_week, start_time, end_time
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(scheduleId, userId, day_of_week, start_time, end_time).run();

      return c.json({ success: true, action: 'created', schedule_id: scheduleId });
    }

  } catch (error) {
    console.error('Erro ao salvar horário:', error);
    return c.json({ error: 'Erro ao salvar horário' }, 500);
  }
});

// ===========================
// LISTAR HORÁRIOS DO STREAMER
// ===========================

app.get('/api/schedules/streamer/:streamerId', async (c) => {
  try {
    const streamerId = c.req.param('streamerId');

    const schedules = await c.env.DB.prepare(`
      SELECT id, day_of_week, start_time, end_time
      FROM streamer_schedules
      WHERE streamer_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).bind(streamerId).all();

    // Organizar por dia
    const weekSchedule = {
      0: [], // Domingo
      1: [], // Segunda
      2: [], // Terça
      3: [], // Quarta
      4: [], // Quinta
      5: [], // Sexta
      6: []  // Sábado
    };

    (schedules.results || []).forEach((sched: any) => {
      weekSchedule[sched.day_of_week].push({
        id: sched.id,
        start_time: sched.start_time,
        end_time: sched.end_time
      });
    });

    return c.json({ schedule: weekSchedule });

  } catch (error) {
    console.error('Erro ao listar horários:', error);
    return c.json({ error: 'Erro ao listar horários' }, 500);
  }
});

// ===========================
// DELETAR HORÁRIO
// ===========================

app.delete('/api/schedules/:scheduleId', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const scheduleId = c.req.param('scheduleId');

    // Verificar ownership
    const schedule = await c.env.DB.prepare(`
      SELECT streamer_id FROM streamer_schedules WHERE id = ?
    `).bind(scheduleId).first();

    if (!schedule) {
      return c.json({ error: 'Horário não encontrado' }, 404);
    }

    if (schedule.streamer_id !== userId) {
      return c.json({ error: 'Sem permissão' }, 403);
    }

    // Soft delete
    await c.env.DB.prepare(`
      UPDATE streamer_schedules SET is_active = 0 WHERE id = ?
    `).bind(scheduleId).run();

    return c.json({ success: true });

  } catch (error) {
    console.error('Erro ao deletar horário:', error);
    return c.json({ error: 'Erro ao deletar horário' }, 500);
  }
});

// ===========================
// CRIAR AUSÊNCIA PROGRAMADA
// ===========================

app.post('/api/schedules/absences', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const user = await c.env.DB.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(userId).first();

    if (user?.role !== 'streamer') {
      return c.json({ error: 'Apenas streamers' }, 403);
    }

    const { start_date, end_date, reason } = await c.req.json();

    if (!start_date || !end_date) {
      return c.json({ error: 'start_date e end_date são obrigatórios' }, 400);
    }

    // Validar formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return c.json({ error: 'Datas devem estar no formato YYYY-MM-DD' }, 400);
    }

    if (start_date > end_date) {
      return c.json({ error: 'Data de início deve ser antes da data de fim' }, 400);
    }

    const absenceId = `abs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await c.env.DB.prepare(`
      INSERT INTO scheduled_absences (
        id, streamer_id, start_date, end_date, reason
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(absenceId, userId, start_date, end_date, reason || null).run();

    // Notificar seguidores com alertas ativos
    const followers = await c.env.DB.prepare(`
      SELECT viewer_id FROM online_alerts
      WHERE streamer_id = ? AND is_active = 1
    `).bind(userId).all();

    const timestamp = Math.floor(Date.now() / 1000);

    for (const follower of (followers.results || [])) {
      await c.env.DB.prepare(`
        INSERT INTO notifications (
          id, user_id, type, title, message, created_at
        ) VALUES (?, ?, 'schedule_update', ?, ?, ?)
      `).bind(
        `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        follower.viewer_id,
        'Streamer estará ausente',
        `Indisponível de ${start_date} até ${end_date}${reason ? ': ' + reason : ''}`,
        timestamp
      ).run();
    }

    return c.json({ success: true, absence_id: absenceId });

  } catch (error) {
    console.error('Erro ao criar ausência:', error);
    return c.json({ error: 'Erro ao criar ausência' }, 500);
  }
});

// ===========================
// LISTAR AUSÊNCIAS
// ===========================

app.get('/api/schedules/streamer/:streamerId/absences', async (c) => {
  try {
    const streamerId = c.req.param('streamerId');
    const today = new Date().toISOString().split('T')[0];

    const absences = await c.env.DB.prepare(`
      SELECT id, start_date, end_date, reason, created_at
      FROM scheduled_absences
      WHERE streamer_id = ? AND end_date >= ?
      ORDER BY start_date
    `).bind(streamerId, today).all();

    return c.json({ absences: absences.results || [] });

  } catch (error) {
    console.error('Erro ao listar ausências:', error);
    return c.json({ error: 'Erro ao listar ausências' }, 500);
  }
});

// ===========================
// VERIFICAR SE STREAMER ESTÁ DISPONÍVEL AGORA
// ===========================

app.get('/api/schedules/streamer/:streamerId/available-now', async (c) => {
  try {
    const streamerId = c.req.param('streamerId');
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = now.toISOString().split('T')[0];

    // Verificar horário da semana
    const schedule = await c.env.DB.prepare(`
      SELECT id FROM streamer_schedules
      WHERE streamer_id = ?
        AND day_of_week = ?
        AND start_time <= ?
        AND end_time >= ?
        AND is_active = 1
      LIMIT 1
    `).bind(streamerId, dayOfWeek, currentTime, currentTime).first();

    // Verificar ausências programadas
    const absence = await c.env.DB.prepare(`
      SELECT id FROM scheduled_absences
      WHERE streamer_id = ?
        AND start_date <= ?
        AND end_date >= ?
      LIMIT 1
    `).bind(streamerId, today, today).first();

    const available = Boolean(schedule && !absence);

    return c.json({ available });

  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    return c.json({ error: 'Erro ao verificar disponibilidade' }, 500);
  }
});

export default app;
