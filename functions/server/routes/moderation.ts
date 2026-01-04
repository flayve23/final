// functions/server/routes/moderation.ts
// Sistema de Moderação e Denúncias - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// CRIAR DENÚNCIA
// ===========================

app.post('/reports/create', async (c) => {
  try {
    const {
      reporter_id,
      reported_id,
      report_type,
      category,
      description,
      evidence_urls,
      call_id,
      message_id
    } = await c.req.json();
    
    // Validações
    if (!reporter_id || !reported_id || !report_type || !description) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Não pode denunciar a si mesmo
    if (reporter_id === reported_id) {
      return c.json({ error: 'You cannot report yourself' }, 400);
    }
    
    // Determinar severidade automaticamente
    let severity = 'medium';
    let priority = 0;
    
    if (['violence', 'illegal_content', 'hate_speech'].includes(report_type)) {
      severity = 'critical';
      priority = 2;  // Urgente
    } else if (['harassment', 'fraud'].includes(report_type)) {
      severity = 'high';
      priority = 1;
    }
    
    const reportId = crypto.randomUUID();
    
    await c.env.DB.prepare(`
      INSERT INTO reports 
      (id, reporter_id, reported_id, report_type, category, description, evidence_urls, 
       call_id, message_id, severity, status, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
      reportId,
      reporter_id,
      reported_id,
      report_type,
      category || null,
      description,
      JSON.stringify(evidence_urls || []),
      call_id || null,
      message_id || null,
      severity,
      priority,
      Math.floor(Date.now() / 1000)
    ).run();
    
    // Audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_logs 
      (id, user_id, action, entity_type, entity_id, changes, created_at)
      VALUES (?, ?, 'report_created', 'report', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      reporter_id,
      reportId,
      JSON.stringify({ report_type, reported_id }),
      Math.floor(Date.now() / 1000)
    ).run();
    
    // TODO: Notificar admin se crítico
    if (severity === 'critical') {
      // await sendAdminAlert(...)
    }
    
    return c.json({
      success: true,
      report_id: reportId,
      message: 'Report submitted successfully'
    });
    
  } catch (error) {
    console.error('Create report error:', error);
    return c.json({ error: 'Failed to create report' }, 500);
  }
});

// ===========================
// LISTAR DENÚNCIAS (ADMIN)
// ===========================

app.get('/reports', async (c) => {
  try {
    const status = c.req.query('status') || 'pending';
    const severity = c.req.query('severity');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = `
      SELECT 
        r.*,
        reporter.email as reporter_email,
        reporter.role as reporter_role,
        reported.email as reported_email,
        reported.role as reported_role,
        admin.email as reviewer_email
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_id = reported.id
      LEFT JOIN users admin ON r.reviewed_by = admin.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    
    if (severity) {
      query += ` AND r.severity = ?`;
      params.push(severity);
    }
    
    query += ` ORDER BY 
      CASE r.priority
        WHEN 2 THEN 1
        WHEN 1 THEN 2
        ELSE 3
      END,
      CASE r.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const reports = await c.env.DB.prepare(query).bind(...params).all();
    
    // Contar total
    let countQuery = `SELECT COUNT(*) as total FROM reports WHERE 1=1`;
    const countParams = [];
    
    if (status) {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    
    if (severity) {
      countQuery += ` AND severity = ?`;
      countParams.push(severity);
    }
    
    const count = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    
    return c.json({
      reports: reports.results,
      total: count.total,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Get reports error:', error);
    return c.json({ error: 'Failed to get reports' }, 500);
  }
});

// ===========================
// DETALHES DE UMA DENÚNCIA
// ===========================

app.get('/reports/:id', async (c) => {
  try {
    const reportId = c.req.param('id');
    
    const report = await c.env.DB.prepare(`
      SELECT 
        r.*,
        reporter.email as reporter_email,
        reporter.role as reporter_role,
        reported.email as reported_email,
        reported.role as reported_role,
        reported.account_status as reported_account_status,
        admin.email as reviewer_email
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      JOIN users reported ON r.reported_id = reported.id
      LEFT JOIN users admin ON r.reviewed_by = admin.id
      WHERE r.id = ?
    `).bind(reportId).first();
    
    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }
    
    // Buscar histórico de denúncias do usuário denunciado
    const previousReports = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM reports
      WHERE reported_id = ? AND status IN ('action_taken', 'reviewing')
    `).bind(report.reported_id).first();
    
    // Buscar ações de moderação anteriores
    const previousActions = await c.env.DB.prepare(`
      SELECT *
      FROM moderation_actions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(report.reported_id).all();
    
    return c.json({
      report,
      previous_reports_count: previousReports.count,
      previous_actions: previousActions.results
    });
    
  } catch (error) {
    console.error('Get report details error:', error);
    return c.json({ error: 'Failed to get report details' }, 500);
  }
});

// ===========================
// RESOLVER DENÚNCIA (ADMIN)
// ===========================

app.post('/reports/:id/resolve', async (c) => {
  try {
    const reportId = c.req.param('id');
    const {
      admin_id,
      action,  // warning, suspension, ban, content_removed, account_restricted, dismissed
      duration_days,  // Para suspension
      notes,
      restrictions  // Para account_restricted
    } = await c.req.json();
    
    // Buscar denúncia
    const report = await c.env.DB.prepare(`
      SELECT * FROM reports WHERE id = ?
    `).bind(reportId).first();
    
    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }
    
    // Processar ação
    if (action === 'dismissed') {
      // Apenas marcar como resolvido
      await c.env.DB.prepare(`
        UPDATE reports 
        SET status = 'dismissed', action_taken = 'dismissed', 
            admin_notes = ?, reviewed_by = ?, reviewed_at = ?
        WHERE id = ?
      `).bind(notes, admin_id, Math.floor(Date.now() / 1000), reportId).run();
      
    } else {
      // Aplicar ação ao usuário
      const actionId = crypto.randomUUID();
      
      // Determinar se é permanente ou temporário
      const expiresAt = duration_days ? Math.floor(Date.now() / 1000) + (duration_days * 86400) : null;
      
      // Inserir ação de moderação
      await c.env.DB.prepare(`
        INSERT INTO moderation_actions
        (id, user_id, admin_id, action_type, reason, report_id, duration_days, 
         restrictions, is_active, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        actionId,
        report.reported_id,
        admin_id,
        action,
        notes,
        reportId,
        duration_days || null,
        restrictions ? JSON.stringify(restrictions) : null,
        expiresAt,
        Math.floor(Date.now() / 1000)
      ).run();
      
      // Atualizar status do usuário
      if (action === 'ban') {
        await c.env.DB.prepare(`
          UPDATE users 
          SET account_status = 'banned', 
              ban_reason = ?, 
              banned_at = ?,
              banned_by = ?
          WHERE id = ?
        `).bind(notes, Math.floor(Date.now() / 1000), admin_id, report.reported_id).run();
        
      } else if (action === 'suspension') {
        await c.env.DB.prepare(`
          UPDATE users 
          SET account_status = 'suspended', 
              suspension_reason = ?, 
              suspension_expires_at = ?
          WHERE id = ?
        `).bind(notes, expiresAt, report.reported_id).run();
        
      } else if (action === 'account_restricted') {
        await c.env.DB.prepare(`
          UPDATE users 
          SET account_status = 'restricted'
          WHERE id = ?
        `).bind(report.reported_id).run();
      }
      
      // Atualizar denúncia
      await c.env.DB.prepare(`
        UPDATE reports 
        SET status = 'action_taken', 
            action_taken = ?, 
            action_details = ?,
            admin_notes = ?, 
            reviewed_by = ?, 
            reviewed_at = ?
        WHERE id = ?
      `).bind(
        action,
        JSON.stringify({ action_id: actionId, duration_days, expires_at: expiresAt }),
        notes,
        admin_id,
        Math.floor(Date.now() / 1000),
        reportId
      ).run();
      
      // Criar notificação para o usuário afetado
      await c.env.DB.prepare(`
        INSERT INTO notifications
        (id, user_id, type, title, message, created_at)
        VALUES (?, ?, 'moderation_action', ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        report.reported_id,
        `Account ${action}`,
        `Your account has been ${action} due to: ${notes}`,
        Math.floor(Date.now() / 1000)
      ).run();
      
      // TODO: Enviar email
    }
    
    // Audit log
    await c.env.DB.prepare(`
      INSERT INTO audit_logs 
      (id, user_id, action, entity_type, entity_id, changes, created_at)
      VALUES (?, ?, 'report_resolved', 'report', ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      admin_id,
      reportId,
      JSON.stringify({ action, reported_id: report.reported_id }),
      Math.floor(Date.now() / 1000)
    ).run();
    
    return c.json({
      success: true,
      message: `Report resolved with action: ${action}`
    });
    
  } catch (error) {
    console.error('Resolve report error:', error);
    return c.json({ error: 'Failed to resolve report' }, 500);
  }
});

// ===========================
// DASHBOARD DE MODERAÇÃO
// ===========================

app.get('/dashboard', async (c) => {
  try {
    // Estatísticas gerais
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) as reviewing,
        SUM(CASE WHEN priority = 2 THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
      FROM reports
      WHERE created_at > ?
    `).bind(Math.floor(Date.now() / 1000) - (86400 * 30)).first();  // Últimos 30 dias
    
    // Denúncias por tipo
    const byType = await c.env.DB.prepare(`
      SELECT report_type, COUNT(*) as count
      FROM reports
      WHERE created_at > ?
      GROUP BY report_type
      ORDER BY count DESC
    `).bind(Math.floor(Date.now() / 1000) - (86400 * 30)).all();
    
    // Ações de moderação recentes
    const recentActions = await c.env.DB.prepare(`
      SELECT 
        ma.*,
        u.email as user_email,
        admin.email as admin_email
      FROM moderation_actions ma
      JOIN users u ON ma.user_id = u.id
      JOIN users admin ON ma.admin_id = admin.id
      ORDER BY ma.created_at DESC
      LIMIT 10
    `).all();
    
    // Usuários com múltiplas denúncias
    const repeatedOffenders = await c.env.DB.prepare(`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.account_status,
        COUNT(r.id) as report_count
      FROM users u
      JOIN reports r ON u.id = r.reported_id
      WHERE r.created_at > ?
      GROUP BY u.id
      HAVING report_count >= 3
      ORDER BY report_count DESC
      LIMIT 10
    `).bind(Math.floor(Date.now() / 1000) - (86400 * 30)).all();
    
    return c.json({
      stats,
      by_type: byType.results,
      recent_actions: recentActions.results,
      repeated_offenders: repeatedOffenders.results
    });
    
  } catch (error) {
    console.error('Moderation dashboard error:', error);
    return c.json({ error: 'Failed to load moderation dashboard' }, 500);
  }
});

// ===========================
// HISTÓRICO DE MODERAÇÃO DE UM USUÁRIO
// ===========================

app.get('/users/:userId/history', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // Denúncias recebidas
    const reportsReceived = await c.env.DB.prepare(`
      SELECT r.*, reporter.email as reporter_email
      FROM reports r
      JOIN users reporter ON r.reporter_id = reporter.id
      WHERE r.reported_id = ?
      ORDER BY r.created_at DESC
    `).bind(userId).all();
    
    // Denúncias feitas
    const reportsMade = await c.env.DB.prepare(`
      SELECT r.*, reported.email as reported_email
      FROM reports r
      JOIN users reported ON r.reported_id = reported.id
      WHERE r.reporter_id = ?
      ORDER BY r.created_at DESC
    `).bind(userId).all();
    
    // Ações de moderação
    const actions = await c.env.DB.prepare(`
      SELECT ma.*, admin.email as admin_email
      FROM moderation_actions ma
      JOIN users admin ON ma.admin_id = admin.id
      WHERE ma.user_id = ?
      ORDER BY ma.created_at DESC
    `).bind(userId).all();
    
    return c.json({
      reports_received: reportsReceived.results,
      reports_made: reportsMade.results,
      moderation_actions: actions.results
    });
    
  } catch (error) {
    console.error('Get user moderation history error:', error);
    return c.json({ error: 'Failed to get user history' }, 500);
  }
});

export default app;
