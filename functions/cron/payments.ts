// V104 SPRINT 2: Cloudflare Workers Scheduled Event
// Processar pagamentos D+30 para streamers

export interface Env {
  DB: D1Database
  MERCADO_PAGO_ACCESS_TOKEN: string
  SENDGRID_API_KEY: string
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('🕐 Cron Job iniciado:', new Date().toISOString())
    
    try {
      // 1. Buscar ganhos de streamers pendentes há mais de 30 dias
      const { results: pendingEarnings } = await env.DB.prepare(`
        SELECT 
          user_id as streamer_id,
          SUM(amount) as total_earnings,
          MIN(created_at) as oldest_transaction,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE type = 'call_earning'
          AND paid = 0
          AND created_at < date('now', '-30 days')
        GROUP BY user_id
        HAVING total_earnings > 0
      `).all()

      console.log(`📊 Encontrados ${pendingEarnings.length} streamers com pagamentos pendentes`)

      for (const earning of pendingEarnings as any[]) {
        try {
          // 2. Criar agendamento de pagamento
          const result = await env.DB.prepare(`
            INSERT INTO scheduled_payments (
              streamer_id, amount, period_start, period_end, due_date, status
            ) VALUES (?, ?, ?, date('now'), date('now'), 'pending')
          `).bind(
            earning.streamer_id,
            earning.total_earnings,
            earning.oldest_transaction
          ).run()

          const paymentId = result.meta.last_row_id

          console.log(`💰 Agendado pagamento #${paymentId}: R$ ${earning.total_earnings} para streamer ${earning.streamer_id}`)

          // 3. Processar pagamento via Mercado Pago (simulado)
          // Em produção real, fazer transferência via API do MP:
          // await processPayoutMP(earning.streamer_id, earning.total_earnings, env)

          // Por enquanto, apenas marcar como processado
          await env.DB.prepare(`
            UPDATE scheduled_payments
            SET status = 'paid', 
                processed_at = datetime('now'),
                payment_method = 'pix',
                payment_reference = ?
            WHERE id = ?
          `).bind(
            `SIM_${Date.now()}`, // ID simulado
            paymentId
          ).run()

          // 4. Marcar transações como pagas
          await env.DB.prepare(`
            UPDATE transactions
            SET paid = 1, paid_at = datetime('now')
            WHERE user_id = ? 
              AND type = 'call_earning'
              AND paid = 0
              AND created_at < date('now', '-30 days')
          `).bind(earning.streamer_id).run()

          console.log(`✅ Pagamento #${paymentId} processado com sucesso`)

          // 5. TODO: Enviar email de confirmação
          // await sendPaymentConfirmationEmail(earning.streamer_id, earning.total_earnings, env)

        } catch (error) {
          console.error(`❌ Erro ao processar pagamento para streamer ${earning.streamer_id}:`, error)
          
          // Registrar erro no agendamento
          await env.DB.prepare(`
            UPDATE scheduled_payments
            SET status = 'failed',
                error_message = ?,
                processed_at = datetime('now')
            WHERE streamer_id = ? AND status = 'pending'
          `).bind(
            error instanceof Error ? error.message : 'Unknown error',
            earning.streamer_id
          ).run()
        }
      }

      console.log('✅ Cron Job finalizado com sucesso')

    } catch (error) {
      console.error('❌ Erro no Cron Job:', error)
      throw error
    }
  }
}

// Função auxiliar para processar pagamento real via Mercado Pago
async function processPayoutMP(streamerId: number, amount: number, env: Env): Promise<string> {
  // Buscar dados bancários do streamer
  const streamer = await env.DB.prepare(`
    SELECT u.email, p.bank_account_pix
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).bind(streamerId).first() as any

  if (!streamer?.bank_account_pix) {
    throw new Error('Streamer sem dados bancários cadastrados')
  }

  // Criar transferência no Mercado Pago
  // Documentação: https://www.mercadopago.com.br/developers/pt/reference/money_out/_money_out_transfers/post
  const response = await fetch('https://api.mercadopago.com/v1/money_out/transfers', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount,
      destination: {
        type: 'pix',
        key: streamer.bank_account_pix
      },
      description: `Pagamento de ganhos D+30 - Streamer ${streamerId}`
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Falha na transferência MP: ${error}`)
  }

  const data = await response.json()
  return data.id // ID da transferência no MP
}
