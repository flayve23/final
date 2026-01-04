import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { 
  DB: D1Database
  JWT_SECRET: string
}

const analytics = new Hono<{ Bindings: Bindings }>()

// =====================================================
// MIDDLEWARE: Verificar autenticação
// =====================================================
analytics.use('/*', async (c, next) => {
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
// HELPER: Registrar evento de analytics
// =====================================================
export async function trackEvent(
  db: D1Database,
  eventType: string,
  userId?: string,
  streamerId?: string,
  metadata?: any
) {
  const id = crypto.randomUUID()
  
  await db.prepare(`
    INSERT INTO analytics_events (id, event_type, user_id, streamer_id, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    eventType,
    userId || null,
    streamerId || null,
    metadata ? JSON.stringify(metadata) : null
  ).run()

  console.log(`📊 Analytics: ${eventType} - user:${userId} streamer:${streamerId}`)
}

// =====================================================
// GET: Dashboard Overview (Admin/Streamer)
// =====================================================
analytics.get('/overview', async (c) => {
  const user = c.get('user') as any
  const period = c.req.query('period') || '7d' // 7d, 30d, 90d, 1y

  try {
    let dateFilter = "datetime('now', '-7 days')"
    if (period === '30d') dateFilter = "datetime('now', '-30 days')"
    if (period === '90d') dateFilter = "datetime('now', '-90 days')"
    if (period === '1y') dateFilter = "datetime('now', '-1 year')"

    // KPIs gerais
    const kpis = await c.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM calls WHERE created_at >= ${dateFilter}) as total_calls,
        (SELECT SUM(CAST(json_extract(metadata, '$.duration') AS INTEGER)) FROM calls WHERE created_at >= ${dateFilter} AND status = 'completed') as total_duration,
        (SELECT SUM(amount) FROM transactions WHERE type = 'call_charge' AND created_at >= ${dateFilter}) as total_revenue,
        (SELECT COUNT(*) FROM users WHERE created_at >= ${dateFilter}) as new_users
    `).first()

    // Calcular médias
    const avgCallDuration = kpis?.total_calls > 0 
      ? Math.round((kpis?.total_duration || 0) / kpis.total_calls)
      : 0

    // Gráfico de receita diária
    const revenueChart = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(amount) as revenue,
        COUNT(*) as transactions
      FROM transactions
      WHERE type = 'call_charge' AND created_at >= ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date
    `).all()

    // Top streamers por receita
    const topStreamers = await c.env.DB.prepare(`
      SELECT 
        u.username,
        u.id,
        COUNT(c.id) as total_calls,
        SUM(CAST(json_extract(c.metadata, '$.duration') AS INTEGER)) as total_minutes,
        SUM(t.amount) as total_revenue
      FROM users u
      JOIN calls c ON c.streamer_id = u.id
      LEFT JOIN transactions t ON t.user_id = c.viewer_id AND t.metadata LIKE '%' || c.id || '%'
      WHERE c.created_at >= ${dateFilter} AND c.status = 'completed'
      GROUP BY u.id, u.username
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all()

    return c.json({
      kpis: {
        total_calls: kpis?.total_calls || 0,
        total_duration: kpis?.total_duration || 0,
        avg_call_duration: avgCallDuration,
        total_revenue: kpis?.total_revenue || 0,
        new_users: kpis?.new_users || 0
      },
      revenue_chart: revenueChart.results || [],
      top_streamers: topStreamers.results || []
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar overview:', error)
    return c.json({ error: 'Erro ao carregar analytics' }, 500)
  }
})

// =====================================================
// GET: Streamer Analytics (dashboard do streamer)
// =====================================================
analytics.get('/streamer/stats', async (c) => {
  const user = c.get('user') as any

  if (user.role !== 'streamer') {
    return c.json({ error: 'Apenas streamers' }, 403)
  }

  const period = c.req.query('period') || '30d'
  let dateFilter = "datetime('now', '-30 days')"
  if (period === '7d') dateFilter = "datetime('now', '-7 days')"
  if (period === '90d') dateFilter = "datetime('now', '-90 days')"

  try {
    // Estatísticas básicas
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CAST(json_extract(metadata, '$.duration') AS INTEGER)) as total_minutes,
        AVG(CAST(json_extract(metadata, '$.duration') AS INTEGER)) as avg_duration
      FROM calls
      WHERE streamer_id = ? AND created_at >= ${dateFilter} AND status = 'completed'
    `).bind(user.userId).first()

    // Receita e ganhos
    const earnings = await c.env.DB.prepare(`
      SELECT 
        SUM(t.amount) as total_revenue,
        SUM(t.amount * (100 - COALESCE(p.custom_commission_rate, 20)) / 100) as streamer_earnings
      FROM transactions t
      LEFT JOIN profiles p ON p.id = ?
      WHERE t.metadata LIKE '%"streamer_id":"' || ? || '"%'
      AND t.type = 'call_charge'
      AND t.created_at >= ${dateFilter}
    `).bind(user.userId, user.userId).first()

    // Gráfico de chamadas por dia
    const callsChart = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as calls,
        SUM(CAST(json_extract(metadata, '$.duration') AS INTEGER)) as minutes
      FROM calls
      WHERE streamer_id = ? AND created_at >= ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date
    `).bind(user.userId).all()

    // Top viewers (quem mais chamou)
    const topViewers = await c.env.DB.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as call_count,
        SUM(CAST(json_extract(c.metadata, '$.duration') AS INTEGER)) as total_minutes
      FROM calls c
      JOIN users u ON u.id = c.viewer_id
      WHERE c.streamer_id = ? AND c.created_at >= ${dateFilter} AND c.status = 'completed'
      GROUP BY u.id, u.username
      ORDER BY call_count DESC
      LIMIT 5
    `).bind(user.userId).all()

    // Horários mais ativos (heatmap)
    const hourlyActivity = await c.env.DB.prepare(`
      SELECT 
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(*) as calls
      FROM calls
      WHERE streamer_id = ? AND created_at >= ${dateFilter}
      GROUP BY hour
      ORDER BY hour
    `).bind(user.userId).all()

    return c.json({
      stats: {
        total_calls: stats?.total_calls || 0,
        total_minutes: stats?.total_minutes || 0,
        avg_duration: Math.round(stats?.avg_duration || 0),
        total_revenue: earnings?.total_revenue || 0,
        streamer_earnings: earnings?.streamer_earnings || 0
      },
      calls_chart: callsChart.results || [],
      top_viewers: topViewers.results || [],
      hourly_activity: hourlyActivity.results || []
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar stats do streamer:', error)
    return c.json({ error: 'Erro ao carregar estatísticas' }, 500)
  }
})

// =====================================================
// GET: Viewer Analytics (histórico do viewer)
// =====================================================
analytics.get('/viewer/stats', async (c) => {
  const user = c.get('user') as any
  const period = c.req.query('period') || '30d'
  
  let dateFilter = "datetime('now', '-30 days')"
  if (period === '7d') dateFilter = "datetime('now', '-7 days')"
  if (period === '90d') dateFilter = "datetime('now', '-90 days')"

  try {
    // Estatísticas básicas
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_calls,
        SUM(CAST(json_extract(metadata, '$.duration') AS INTEGER)) as total_minutes,
        AVG(CAST(json_extract(metadata, '$.duration') AS INTEGER)) as avg_duration
      FROM calls
      WHERE viewer_id = ? AND created_at >= ${dateFilter} AND status = 'completed'
    `).bind(user.userId).first()

    // Gastos totais
    const spending = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total_spent
      FROM transactions
      WHERE user_id = ? AND type = 'call_charge' AND created_at >= ${dateFilter}
    `).bind(user.userId).first()

    // Gráfico de gastos por dia
    const spendingChart = await c.env.DB.prepare(`
      SELECT 
        date(created_at) as date,
        SUM(amount) as spent,
        COUNT(*) as transactions
      FROM transactions
      WHERE user_id = ? AND type = 'call_charge' AND created_at >= ${dateFilter}
      GROUP BY date(created_at)
      ORDER BY date
    `).bind(user.userId).all()

    // Top streamers (com quem mais conversou)
    const topStreamers = await c.env.DB.prepare(`
      SELECT 
        u.username,
        COUNT(c.id) as call_count,
        SUM(CAST(json_extract(c.metadata, '$.duration') AS INTEGER)) as total_minutes
      FROM calls c
      JOIN users u ON u.id = c.streamer_id
      WHERE c.viewer_id = ? AND c.created_at >= ${dateFilter} AND c.status = 'completed'
      GROUP BY u.id, u.username
      ORDER BY call_count DESC
      LIMIT 5
    `).bind(user.userId).all()

    return c.json({
      stats: {
        total_calls: stats?.total_calls || 0,
        total_minutes: stats?.total_minutes || 0,
        avg_duration: Math.round(stats?.avg_duration || 0),
        total_spent: spending?.total_spent || 0
      },
      spending_chart: spendingChart.results || [],
      top_streamers: topStreamers.results || []
    })
  } catch (error: any) {
    console.error('❌ Erro ao buscar stats do viewer:', error)
    return c.json({ error: 'Erro ao carregar estatísticas' }, 500)
  }
})

// =====================================================
// POST: Registrar evento customizado
// =====================================================
analytics.post('/event', async (c) => {
  const user = c.get('user') as any
  const { event_type, metadata } = await c.req.json()

  if (!event_type) {
    return c.json({ error: 'event_type é obrigatório' }, 400)
  }

  try {
    await trackEvent(c.env.DB, event_type, user.userId, undefined, metadata)
    return c.json({ success: true })
  } catch (error: any) {
    console.error('❌ Erro ao registrar evento:', error)
    return c.json({ error: 'Erro ao registrar evento' }, 500)
  }
})

// =====================================================
// GET: Exportar relatório (CSV)
// =====================================================
analytics.get('/export/csv', async (c) => {
  const user = c.get('user') as any
  const type = c.req.query('type') || 'calls' // calls, revenue, users
  const period = c.req.query('period') || '30d'

  if (user.role !== 'admin' && user.role !== 'streamer') {
    return c.json({ error: 'Sem permissão' }, 403)
  }

  let dateFilter = "datetime('now', '-30 days')"
  if (period === '7d') dateFilter = "datetime('now', '-7 days')"
  if (period === '90d') dateFilter = "datetime('now', '-90 days')"

  try {
    let csv = ''
    
    if (type === 'calls') {
      const data = await c.env.DB.prepare(`
        SELECT 
          c.id,
          c.created_at,
          uv.username as viewer,
          us.username as streamer,
          c.status,
          json_extract(c.metadata, '$.duration') as duration,
          json_extract(c.metadata, '$.cost') as cost
        FROM calls c
        JOIN users uv ON uv.id = c.viewer_id
        JOIN users us ON us.id = c.streamer_id
        WHERE c.created_at >= ${dateFilter}
        ORDER BY c.created_at DESC
        LIMIT 1000
      `).all()

      csv = 'ID,Data,Viewer,Streamer,Status,Duração (min),Custo (R$)\n'
      data.results?.forEach((row: any) => {
        csv += `${row.id},${row.created_at},${row.viewer},${row.streamer},${row.status},${row.duration || 0},${row.cost || 0}\n`
      })
    } else if (type === 'revenue') {
      const data = await c.env.DB.prepare(`
        SELECT 
          date(created_at) as date,
          SUM(amount) as revenue,
          COUNT(*) as transactions
        FROM transactions
        WHERE type = 'call_charge' AND created_at >= ${dateFilter}
        GROUP BY date(created_at)
        ORDER BY date
      `).all()

      csv = 'Data,Receita (R$),Transações\n'
      data.results?.forEach((row: any) => {
        csv += `${row.date},${row.revenue},${row.transactions}\n`
      })
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report_${type}_${period}.csv"`
      }
    })
  } catch (error: any) {
    console.error('❌ Erro ao exportar CSV:', error)
    return c.json({ error: 'Erro ao gerar relatório' }, 500)
  }
})

export default analytics
