// functions/cron/reconciliation.ts
// Reconciliação Financeira Diária - FLAYVE

export interface Env {
  DB: D1Database;
  SENDGRID_API_KEY: string;
  ADMIN_EMAIL: string;
}

// ===========================
// FUNÇÃO PRINCIPAL
// ===========================

export async function dailyReconciliation(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  
  console.log('[RECONCILIATION] Starting daily reconciliation...');
  
  try {
    // ===========================
    // 1. CALCULAR TRANSAÇÕES DO DIA
    // ===========================
    
    // Depósitos
    const deposits = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM wallet_transactions
      WHERE type = 'deposit' 
      AND status = 'completed'
      AND created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    // Saques
    const withdrawals = await env.DB.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total, COUNT(*) as count
      FROM wallet_transactions
      WHERE type = 'withdrawal' 
      AND status = 'completed'
      AND created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    // Ganhos (earnings de streamers)
    const earnings = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM wallet_transactions
      WHERE type = 'earning' 
      AND status = 'completed'
      AND created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    // Gastos (spending de viewers)
    const spending = await env.DB.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total, COUNT(*) as count
      FROM wallet_transactions
      WHERE type = 'spend' 
      AND status = 'completed'
      AND created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    // ===========================
    // 2. CALCULAR COMISSÃO DA PLATAFORMA
    // ===========================
    
    // Comissão = 30% dos ganhos dos streamers
    const platformRevenue = earnings.total * 0.30;
    
    // ===========================
    // 3. SALDO TOTAL ATUAL
    // ===========================
    
    const totalBalance = await env.DB.prepare(`
      SELECT COALESCE(SUM(balance), 0) as total
      FROM wallets
    `).first();
    
    // ===========================
    // 4. BUSCAR SALDO ANTERIOR
    // ===========================
    
    const previousReport = await env.DB.prepare(`
      SELECT actual_balance
      FROM reconciliation_reports
      ORDER BY created_at DESC
      LIMIT 1
    `).first();
    
    const previousBalance = previousReport?.actual_balance || 0;
    
    // ===========================
    // 5. CALCULAR SALDO ESPERADO
    // ===========================
    
    // Saldo esperado = Saldo anterior + Depósitos - Saques
    const expectedBalance = previousBalance + deposits.total - withdrawals.total;
    
    // ===========================
    // 6. CALCULAR DISCREPÂNCIA
    // ===========================
    
    const discrepancy = Math.abs(totalBalance.total - expectedBalance);
    const discrepancyPercentage = expectedBalance > 0 
      ? (discrepancy / expectedBalance) * 100 
      : 0;
    
    // ===========================
    // 7. DETERMINAR STATUS
    // ===========================
    
    let status = 'ok';
    
    if (discrepancy > 100) {  // Mais de R$ 100 de diferença
      status = 'critical';
    } else if (discrepancy > 10) {  // Mais de R$ 10
      status = 'warning';
    } else if (discrepancy > 0.01) {  // Mais de R$ 0,01
      status = 'investigating';
    }
    
    // ===========================
    // 8. SALVAR RELATÓRIO
    // ===========================
    
    const reportId = crypto.randomUUID();
    const reportDate = Math.floor(Date.now() / 1000 / 86400) * 86400;  // Midnight UTC
    
    await env.DB.prepare(`
      INSERT INTO reconciliation_reports
      (id, report_date, period_start, period_end, 
       total_deposits, total_withdrawals, total_earnings, total_spending, 
       platform_revenue, expected_balance, actual_balance, 
       discrepancy, discrepancy_percentage, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      reportId,
      reportDate,
      oneDayAgo,
      now,
      deposits.total,
      withdrawals.total,
      earnings.total,
      spending.total,
      platformRevenue,
      expectedBalance,
      totalBalance.total,
      discrepancy,
      discrepancyPercentage,
      status,
      now
    ).run();
    
    console.log(`[RECONCILIATION] Report created with status: ${status}`);
    console.log(`[RECONCILIATION] Discrepancy: R$ ${discrepancy.toFixed(2)} (${discrepancyPercentage.toFixed(2)}%)`);
    
    // ===========================
    // 9. ALERTAR SE HOUVER PROBLEMAS
    // ===========================
    
    if (status !== 'ok') {
      await sendReconciliationAlert(env, {
        reportId,
        status,
        discrepancy,
        discrepancyPercentage,
        expectedBalance,
        actualBalance: totalBalance.total,
        deposits: deposits.total,
        withdrawals: withdrawals.total,
        earnings: earnings.total,
        spending: spending.total,
        platformRevenue
      });
    }
    
    // ===========================
    // 10. VERIFICAR CHARGEBACKS
    // ===========================
    
    const recentChargebacks = await env.DB.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM chargebacks
      WHERE created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    if (recentChargebacks.count > 0) {
      console.log(`[RECONCILIATION] Chargebacks detected: ${recentChargebacks.count} totaling R$ ${recentChargebacks.total.toFixed(2)}`);
    }
    
    // ===========================
    // 11. VERIFICAR FRAUDES
    // ===========================
    
    const recentFraudFlags = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM fraud_flags
      WHERE severity IN ('high', 'critical')
      AND reviewed = 0
      AND created_at BETWEEN ? AND ?
    `).bind(oneDayAgo, now).first();
    
    if (recentFraudFlags.count > 0) {
      console.log(`[RECONCILIATION] Unreviewed fraud flags: ${recentFraudFlags.count}`);
    }
    
    // ===========================
    // 12. RELATÓRIO DIÁRIO POR EMAIL
    // ===========================
    
    await sendDailyReport(env, {
      deposits,
      withdrawals,
      earnings,
      spending,
      platformRevenue,
      totalBalance: totalBalance.total,
      discrepancy,
      status,
      chargebacks: recentChargebacks,
      fraudFlags: recentFraudFlags.count
    });
    
    console.log('[RECONCILIATION] Daily reconciliation completed successfully');
    
  } catch (error) {
    console.error('[RECONCILIATION] Error:', error);
    
    // Alertar admin sobre erro
    await sendErrorAlert(env, error);
    
    throw error;
  }
}

// ===========================
// ENVIAR ALERTA DE DISCREPÂNCIA
// ===========================

async function sendReconciliationAlert(env: Env, data: any): Promise<void> {
  const subject = `🚨 ALERTA: Discrepância na Reconciliação Financeira - FLAYVE`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #EF4444;">🚨 Discrepância Detectada</h1>
      
      <p><strong>Status:</strong> <span style="color: ${data.status === 'critical' ? '#EF4444' : '#F59E0B'}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
      
      <h2>Resumo:</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #F3F4F6;">
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Saldo Esperado:</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB;">R$ ${data.expectedBalance.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Saldo Real:</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB;">R$ ${data.actualBalance.toFixed(2)}</td>
        </tr>
        <tr style="background: #FEE2E2;">
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Discrepância:</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; color: #EF4444; font-weight: bold;">R$ ${data.discrepancy.toFixed(2)} (${data.discrepancyPercentage.toFixed(2)}%)</td>
        </tr>
      </table>
      
      <h2>Transações do Dia:</h2>
      <ul>
        <li><strong>Depósitos:</strong> R$ ${data.deposits.toFixed(2)}</li>
        <li><strong>Saques:</strong> R$ ${data.withdrawals.toFixed(2)}</li>
        <li><strong>Ganhos Streamers:</strong> R$ ${data.earnings.toFixed(2)}</li>
        <li><strong>Gastos Viewers:</strong> R$ ${data.spending.toFixed(2)}</li>
        <li><strong>Comissão Plataforma:</strong> R$ ${data.platformRevenue.toFixed(2)}</li>
      </ul>
      
      <p style="margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B;">
        <strong>⚠️ Ação Necessária:</strong> Investigue esta discrepância imediatamente no dashboard de reconciliação.
      </p>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://flayve.com/admin/reconciliation/${data.reportId}" 
           style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">
          Ver Relatório Completo
        </a>
      </p>
    </div>
  `;
  
  await sendEmail(env, env.ADMIN_EMAIL, subject, html);
}

// ===========================
// ENVIAR RELATÓRIO DIÁRIO
// ===========================

async function sendDailyReport(env: Env, data: any): Promise<void> {
  const subject = `📊 Relatório Financeiro Diário - FLAYVE - ${new Date().toLocaleDateString('pt-BR')}`;
  
  const statusColor = data.status === 'ok' ? '#10B981' : data.status === 'warning' ? '#F59E0B' : '#EF4444';
  const statusIcon = data.status === 'ok' ? '✅' : data.status === 'warning' ? '⚠️' : '🚨';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #8B5CF6;">📊 Relatório Financeiro Diário</h1>
      <p style="color: #64748B;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
      
      <div style="padding: 20px; background: #F9FAFB; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Status da Reconciliação: ${statusIcon} ${data.status.toUpperCase()}</h2>
        <p style="font-size: 24px; margin: 10px 0; color: ${statusColor};">
          <strong>Saldo Total: R$ ${data.totalBalance.toFixed(2)}</strong>
        </p>
        ${data.discrepancy > 0.01 ? `<p style="color: #EF4444;">Discrepância: R$ ${data.discrepancy.toFixed(2)}</p>` : ''}
      </div>
      
      <h2>Transações do Dia:</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #F3F4F6;">
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Depósitos</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">
            R$ ${data.deposits.total.toFixed(2)}
            <br><small style="color: #64748B;">${data.deposits.count} transações</small>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Saques</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">
            R$ ${data.withdrawals.total.toFixed(2)}
            <br><small style="color: #64748B;">${data.withdrawals.count} transações</small>
          </td>
        </tr>
        <tr style="background: #F3F4F6;">
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Ganhos Streamers</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">
            R$ ${data.earnings.total.toFixed(2)}
            <br><small style="color: #64748B;">${data.earnings.count} transações</small>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Gastos Viewers</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right;">
            R$ ${data.spending.total.toFixed(2)}
            <br><small style="color: #64748B;">${data.spending.count} transações</small>
          </td>
        </tr>
        <tr style="background: #ECFDF5;">
          <td style="padding: 10px; border: 1px solid #E5E7EB;"><strong>Comissão Plataforma (30%)</strong></td>
          <td style="padding: 10px; border: 1px solid #E5E7EB; text-align: right; color: #10B981; font-weight: bold;">
            R$ ${data.platformRevenue.toFixed(2)}
          </td>
        </tr>
      </table>
      
      <h2>Alertas:</h2>
      <ul>
        ${data.chargebacks.count > 0 ? `<li><strong>⚠️ Chargebacks:</strong> ${data.chargebacks.count} (R$ ${data.chargebacks.total.toFixed(2)})</li>` : ''}
        ${data.fraudFlags > 0 ? `<li><strong>🚨 Flags de Fraude:</strong> ${data.fraudFlags} não revisados</li>` : ''}
        ${data.chargebacks.count === 0 && data.fraudFlags === 0 ? '<li style="color: #10B981;">✅ Nenhum alerta</li>' : ''}
      </ul>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="https://flayve.com/admin/reconciliation" 
           style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 6px;">
          Ver Dashboard Completo
        </a>
      </p>
    </div>
  `;
  
  await sendEmail(env, env.ADMIN_EMAIL, subject, html);
}

// ===========================
// ENVIAR ALERTA DE ERRO
// ===========================

async function sendErrorAlert(env: Env, error: any): Promise<void> {
  const subject = `🚨 ERRO: Falha na Reconciliação Diária - FLAYVE`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #EF4444;">🚨 Erro na Reconciliação</h1>
      
      <p>A reconciliação financeira diária falhou com o seguinte erro:</p>
      
      <pre style="background: #FEE2E2; padding: 15px; border-radius: 6px; overflow-x: auto;">
${error.message}

Stack trace:
${error.stack}
      </pre>
      
      <p style="margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B;">
        <strong>⚠️ Ação Imediata Necessária:</strong> Verifique os logs e execute a reconciliação manualmente.
      </p>
    </div>
  `;
  
  await sendEmail(env, env.ADMIN_EMAIL, subject, html);
}

// ===========================
// FUNÇÃO AUXILIAR DE EMAIL
// ===========================

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    console.warn('[RECONCILIATION] SendGrid API key not configured, skipping email');
    return;
  }
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }]
        }],
        from: { email: 'noreply@flayve.com', name: 'FLAYVE System' },
        subject,
        content: [{
          type: 'text/html',
          value: html
        }]
      })
    });
    
    if (!response.ok) {
      console.error('[RECONCILIATION] Failed to send email:', await response.text());
    } else {
      console.log('[RECONCILIATION] Email sent successfully');
    }
  } catch (error) {
    console.error('[RECONCILIATION] Error sending email:', error);
  }
}

// ===========================
// EXPORTAR PARA CRON
// ===========================

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(dailyReconciliation(env));
  }
};
