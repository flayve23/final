import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
}

const reports = new Hono<{ Bindings: Bindings }>()

// Middleware: Admin only
reports.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload || payload.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403)
  }
  
  c.set('user', payload)
  await next()
})

// V104 SPRINT 2: Receita por período (dia, semana, mês)
reports.get('/revenue', async (c) => {
  try {
    const { period } = c.req.query() // 'day', 'week', 'month'
    
    let dateGroup = ''
    let dateFilter = ''
    
    switch (period) {
      case 'week':
        dateGroup = 'date(created_at)'
        dateFilter = "created_at >= date('now', '-7 days')"
        break
      case 'month':
        dateGroup = 'date(created_at)'
        dateFilter = "created_at >= date('now', '-30 days')"
        break
      case 'year':
        dateGroup = "strftime('%Y-%m', created_at)"
        dateFilter = "created_at >= date('now', '-12 months')"
        break
      default: // day
        dateGroup = "strftime('%Y-%m-%d %H:00:00', created_at)"
        dateFilter = "created_at >= date('now', '-1 day')"
    }
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        ${dateGroup} as date,
        SUM(CASE WHEN type = 'call_payment' THEN amount ELSE 0 END) as revenue,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE ${dateFilter}
      GROUP BY ${dateGroup}
      ORDER BY date ASC
    `).all()
    
    return c.json({ revenue: results })
    
  } catch (e: any) {
    console.error('❌ Revenue report error:', e)
    return c.json({ error: `Failed to generate report: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Top streamers por receita
reports.get('/top-streamers', async (c) => {
  try {
    const { limit } = c.req.query()
    const maxResults = parseInt(limit || '10')
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        u.id,
        u.username,
        p.photo_url,
        SUM(t.amount) as total_earnings,
        COUNT(DISTINCT c.id) as total_calls,
        AVG(c.duration_seconds) as avg_call_duration,
        p.average_rating
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN calls c ON c.streamer_id = u.id
      WHERE t.type = 'call_earning'
        AND t.created_at >= date('now', '-30 days')
      GROUP BY u.id
      ORDER BY total_earnings DESC
      LIMIT ?
    `).bind(maxResults).all()
    
    return c.json({ top_streamers: results })
    
  } catch (e: any) {
    console.error('❌ Top streamers report error:', e)
    return c.json({ error: `Failed to generate report: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: KPIs gerais
reports.get('/kpis', async (c) => {
  try {
    // Receita total (últimos 30 dias)
    const revenue = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'call_payment' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN type = 'call_earning' THEN amount ELSE 0 END) as streamer_earnings
      FROM transactions
      WHERE created_at >= date('now', '-30 days')
    `).first()
    
    // Taxa da plataforma (20%)
    const platform_fee = (revenue?.total_revenue || 0) - (revenue?.streamer_earnings || 0)
    
    // Total de chamadas
    const calls = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(duration_seconds) as avg_duration,
        AVG(cost_total) as avg_value
      FROM calls
      WHERE created_at >= date('now', '-30 days')
        AND status = 'completed'
    `).first()
    
    // Usuários ativos
    const users = await c.env.DB.prepare(`
      SELECT 
        COUNT(DISTINCT viewer_id) as viewers,
        COUNT(DISTINCT streamer_id) as streamers
      FROM calls
      WHERE created_at >= date('now', '-30 days')
    `).first()
    
    // Chargebacks
    const chargebacks = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(amount) as total_amount
      FROM chargebacks
      WHERE created_at >= date('now', '-30 days')
    `).first()
    
    // Taxa de conversão (viewers que fizeram chamada / total viewers)
    const conversion = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(DISTINCT user_id) FROM transactions WHERE type = 'call_payment' AND created_at >= date('now', '-30 days')) as paying_users,
        (SELECT COUNT(*) FROM users WHERE role = 'viewer' AND created_at >= date('now', '-30 days')) as total_users
    `).first()
    
    const conversion_rate = conversion && conversion.total_users > 0
      ? ((conversion.paying_users / conversion.total_users) * 100).toFixed(2)
      : 0
    
    return c.json({
      revenue: {
        total: revenue?.total_revenue || 0,
        streamer_earnings: revenue?.streamer_earnings || 0,
        platform_fee: platform_fee,
        platform_fee_percentage: 20
      },
      calls: {
        total: calls?.total || 0,
        avg_duration_minutes: calls ? Math.floor(calls.avg_duration / 60) : 0,
        avg_value: calls?.avg_value || 0
      },
      users: {
        viewers: users?.viewers || 0,
        streamers: users?.streamers || 0
      },
      chargebacks: {
        total: chargebacks?.total || 0,
        amount: chargebacks?.total_amount || 0
      },
      conversion_rate: conversion_rate
    })
    
  } catch (e: any) {
    console.error('❌ KPIs report error:', e)
    return c.json({ error: `Failed to generate KPIs: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Exportar relatório em CSV
reports.get('/export/csv', async (c) => {
  try {
    const { start_date, end_date } = c.req.query()
    
    const { results } = await c.env.DB.prepare(`
      SELECT 
        t.created_at as date,
        t.type,
        t.amount,
        t.status,
        u.username,
        u.email,
        u.role
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.created_at >= ? AND t.created_at <= ?
      ORDER BY t.created_at DESC
    `).bind(
      start_date || "date('now', '-30 days')",
      end_date || "date('now')"
    ).all()
    
    // Gerar CSV
    const headers = ['Data', 'Tipo', 'Valor', 'Status', 'Usuário', 'Email', 'Role']
    const rows = results.map((row: any) => [
      row.date,
      row.type,
      row.amount,
      row.status,
      row.username,
      row.email,
      row.role
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    
    return c.text(csv, 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="flayve_report_${Date.now()}.csv"`
    })
    
  } catch (e: any) {
    console.error('❌ CSV export error:', e)
    return c.json({ error: `Failed to export CSV: ${e.message}` }, 500)
  }
})

// V104 SPRINT 2: Métricas para compliance fiscal
reports.get('/tax-summary', async (c) => {
  try {
    const { year, month } = c.req.query()
    
    let dateFilter = year 
      ? `strftime('%Y', created_at) = '${year}'`
      : "created_at >= date('now', '-12 months')"
    
    if (month) {
      dateFilter += ` AND strftime('%m', created_at) = '${month.padStart(2, '0')}'`
    }
    
    // Receita bruta
    const gross = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total
      FROM transactions
      WHERE type = 'call_payment' AND ${dateFilter}
    `).first()
    
    // Pagamentos a streamers
    const payouts = await c.env.DB.prepare(`
      SELECT 
        SUM(amount) as total
      FROM transactions
      WHERE type = 'call_earning' AND ${dateFilter}
    `).first()
    
    // Taxa da plataforma
    const platform_fee = (gross?.total || 0) - (payouts?.total || 0)
    
    // Impostos estimados (exemplo: 15% sobre taxa da plataforma)
    const estimated_tax = platform_fee * 0.15
    
    return c.json({
      period: { year: year || 'all', month: month || 'all' },
      gross_revenue: gross?.total || 0,
      streamer_payouts: payouts?.total || 0,
      platform_fee: platform_fee,
      estimated_tax: estimated_tax,
      net_income: platform_fee - estimated_tax
    })
    
  } catch (e: any) {
    console.error('❌ Tax summary error:', e)
    return c.json({ error: `Failed to generate tax summary: ${e.message}` }, 500)
  }
})

export default reports
