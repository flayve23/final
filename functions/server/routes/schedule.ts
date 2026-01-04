import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
}

const schedule = new Hono<{ Bindings: Bindings }>()

// =====================================================
// MIDDLEWARE: Verificar autenticação
// =====================================================
schedule.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido' }, 401)
  }

  const token = authHeader.substring(7)
  const payload = verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload) {
    return c.json({ error: 'Token inválido ou expirado' }, 401)
  }

  c.set('user', payload)
  await next()
})

// =====================================================
// GET: Obter horários disponíveis do streamer
// =====================================================
schedule.get('/:streamerId', async (c) => {
  const { streamerId } = c.req.param()

  try {
    // Buscar horários recorrentes
    const scheduleResult = await c.env.DB.prepare(`
      SELECT * FROM availability_schedule
      WHERE streamer_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).bind(streamerId).all()

    // Buscar bloqueios futuros
    const blockedResult = await c.env.DB.prepare(`
      SELECT * FROM blocked_slots
      WHERE streamer_id = ? AND end_datetime > datetime('now')
      ORDER BY start_datetime
    `).bind(streamerId).all()

    // Buscar preferências
    const preferences = await c.env.DB.prepare(`
      SELECT * FROM streamer_preferences WHERE streamer_id = ?
    `).bind(streamerId).first()

    return c.json({
      schedule: scheduleResult.results || [],
      blocked_slots: blockedResult.results || [],
      preferences: preferences || {
        auto_accept_calls: 0,
        require_booking: 0,
        min_booking_notice: 0,
        max_concurrent_calls: 1,
        break_between_calls: 5
      }
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar agenda:', error)
    return c.json({ error: 'Erro ao carregar agenda' }, 500)
  }
})

// =====================================================
// POST: Adicionar horário disponível (recorrente)
// =====================================================
schedule.post('/availability', async (c) => {
  const user = c.get('user') as any
  const { day_of_week, start_time, end_time, timezone } = await c.req.json()

  if (user.role !== 'streamer') {
    return c.json({ error: 'Apenas streamers podem definir horários' }, 403)
  }

  if (day_of_week < 0 || day_of_week > 6) {
    return c.json({ error: 'day_of_week deve ser entre 0 (Domingo) e 6 (Sábado)' }, 400)
  }

  if (!start_time || !end_time) {
    return c.json({ error: 'start_time e end_time são obrigatórios (formato HH:MM)' }, 400)
  }

  try {
    const id = crypto.randomUUID()

    await c.env.DB.prepare(`
      INSERT INTO availability_schedule (id, streamer_id, day_of_week, start_time, end_time, timezone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(
      id,
      user.userId,
      day_of_week,
      start_time,
      end_time,
      timezone || 'America/Sao_Paulo'
    ).run()

    console.log(`📅 Horário adicionado: ${day_of_week} ${start_time}-${end_time} por ${user.userId}`)

    return c.json({ success: true, schedule_id: id }, 201)
  } catch (error: any) {
    console.error('❌ Erro ao adicionar horário:', error)
    return c.json({ error: 'Erro ao criar horário' }, 500)
  }
})

// =====================================================
// DELETE: Remover horário disponível
// =====================================================
schedule.delete('/availability/:id', async (c) => {
  const user = c.get('user') as any
  const { id } = c.req.param()

  try {
    await c.env.DB.prepare(`
      DELETE FROM availability_schedule
      WHERE id = ? AND streamer_id = ?
    `).bind(id, user.userId).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao remover horário:', error)
    return c.json({ error: 'Erro ao deletar horário' }, 500)
  }
})

// =====================================================
// POST: Bloquear horário específico
// =====================================================
schedule.post('/block', async (c) => {
  const user = c.get('user') as any
  const { start_datetime, end_datetime, reason, notes } = await c.req.json()

  if (user.role !== 'streamer') {
    return c.json({ error: 'Apenas streamers podem bloquear horários' }, 403)
  }

  if (!start_datetime || !end_datetime) {
    return c.json({ error: 'start_datetime e end_datetime são obrigatórios (ISO 8601)' }, 400)
  }

  try {
    const id = crypto.randomUUID()

    await c.env.DB.prepare(`
      INSERT INTO blocked_slots (id, streamer_id, start_datetime, end_datetime, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      user.userId,
      start_datetime,
      end_datetime,
      reason || 'other',
      notes || ''
    ).run()

    console.log(`🚫 Bloqueio criado: ${start_datetime} - ${end_datetime} por ${user.userId}`)

    return c.json({ success: true, block_id: id }, 201)
  } catch (error: any) {
    console.error('❌ Erro ao criar bloqueio:', error)
    return c.json({ error: 'Erro ao bloquear horário' }, 500)
  }
})

// =====================================================
// DELETE: Remover bloqueio
// =====================================================
schedule.delete('/block/:id', async (c) => {
  const user = c.get('user') as any
  const { id } = c.req.param()

  try {
    await c.env.DB.prepare(`
      DELETE FROM blocked_slots
      WHERE id = ? AND streamer_id = ?
    `).bind(id, user.userId).run()

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao remover bloqueio:', error)
    return c.json({ error: 'Erro ao deletar bloqueio' }, 500)
  }
})

// =====================================================
// PUT: Atualizar preferências do streamer
// =====================================================
schedule.put('/preferences', async (c) => {
  const user = c.get('user') as any
  const {
    auto_accept_calls,
    require_booking,
    min_booking_notice,
    max_concurrent_calls,
    break_between_calls
  } = await c.req.json()

  if (user.role !== 'streamer') {
    return c.json({ error: 'Apenas streamers' }, 403)
  }

  try {
    // Upsert (inserir ou atualizar)
    await c.env.DB.prepare(`
      INSERT INTO streamer_preferences (
        streamer_id, auto_accept_calls, require_booking, min_booking_notice,
        max_concurrent_calls, break_between_calls, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(streamer_id) DO UPDATE SET
        auto_accept_calls = excluded.auto_accept_calls,
        require_booking = excluded.require_booking,
        min_booking_notice = excluded.min_booking_notice,
        max_concurrent_calls = excluded.max_concurrent_calls,
        break_between_calls = excluded.break_between_calls,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      user.userId,
      auto_accept_calls ?? 0,
      require_booking ?? 0,
      min_booking_notice ?? 0,
      max_concurrent_calls ?? 1,
      break_between_calls ?? 5
    ).run()

    console.log(`⚙️ Preferências atualizadas: ${user.userId}`)

    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao atualizar preferências:', error)
    return c.json({ error: 'Erro ao salvar preferências' }, 500)
  }
})

// =====================================================
// GET: Verificar se streamer está disponível AGORA
// =====================================================
schedule.get('/check-availability/:streamerId', async (c) => {
  const { streamerId } = c.req.param()

  try {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0-6
    const currentTime = now.toTimeString().substring(0, 5) // HH:MM

    // Verificar se está em horário recorrente
    const scheduleMatch = await c.env.DB.prepare(`
      SELECT * FROM availability_schedule
      WHERE streamer_id = ?
      AND day_of_week = ?
      AND start_time <= ?
      AND end_time >= ?
      AND is_active = 1
      LIMIT 1
    `).bind(streamerId, dayOfWeek, currentTime, currentTime).first()

    if (!scheduleMatch) {
      return c.json({ available: false, reason: 'Fora do horário de atendimento' })
    }

    // Verificar bloqueios
    const nowISO = now.toISOString()
    const blockMatch = await c.env.DB.prepare(`
      SELECT * FROM blocked_slots
      WHERE streamer_id = ?
      AND start_datetime <= ?
      AND end_datetime >= ?
      LIMIT 1
    `).bind(streamerId, nowISO, nowISO).first()

    if (blockMatch) {
      return c.json({
        available: false,
        reason: 'Streamer temporariamente indisponível',
        blocked_until: blockMatch.end_datetime
      })
    }

    // Verificar se está em chamada (opcional - integrar com calls)
    // const activeCall = await c.env.DB.prepare(`
    //   SELECT * FROM calls WHERE streamer_id = ? AND status = 'active' LIMIT 1
    // `).bind(streamerId).first()

    // if (activeCall) {
    //   return c.json({ available: false, reason: 'Em chamada' })
    // }

    return c.json({ available: true })
  } catch (error: any) {
    console.error('❌ Erro ao verificar disponibilidade:', error)
    return c.json({ error: 'Erro ao verificar disponibilidade' }, 500)
  }
})

export default schedule
