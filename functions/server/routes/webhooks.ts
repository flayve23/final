import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  MERCADO_PAGO_ACCESS_TOKEN: string;
};

const webhooks = new Hono<{ Bindings: Bindings }>();

// ============================================
// V104: WEBHOOK DO MERCADO PAGO
// ============================================

webhooks.post('/mercadopago', async (c) => {
  try {
    const body = await c.req.json();
    
    console.log('📥 Webhook MP recebido:', JSON.stringify(body, null, 2));
    
    // Mercado Pago envia notificações de diferentes tipos
    if (body.action === 'payment.updated' || body.action === 'payment.created') {
      const paymentId = body.data?.id;
      
      if (!paymentId) {
        console.warn('⚠️ Webhook sem payment ID');
        return c.json({ error: 'Payment ID missing' }, 400);
      }
      
      // Buscar detalhes completos do pagamento na API do MP
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${c.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!mpRes.ok) {
        const errorText = await mpRes.text();
        console.error('❌ Erro ao buscar pagamento:', errorText);
        return c.json({ error: 'Failed to fetch payment from MP' }, 500);
      }
      
      const payment = await mpRes.json();
      
      console.log(`💳 Payment ${paymentId} - Status: ${payment.status}`);
      
      // Processar apenas pagamentos aprovados
      if (payment.status === 'approved') {
        // Buscar transação pendente no banco
        const transaction = await c.env.DB.prepare(`
          SELECT id, user_id, amount 
          FROM transactions
          WHERE type = 'deposit' 
          AND status = 'pending'
          AND json_extract(metadata, '$.mp_id') = ?
          LIMIT 1
        `).bind(String(paymentId)).first() as any;
        
        if (transaction) {
          // Atualizar status para completed
          await c.env.DB.prepare(`
            UPDATE transactions 
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(transaction.id).run();
          
          console.log(`✅ Recarga creditada: User ${transaction.user_id} - R$ ${transaction.amount}`);
          
          // TODO: Enviar email de confirmação aqui
          // await sendConfirmationEmail(transaction.user_id, transaction.amount);
          
          return c.json({ 
            received: true, 
            message: 'Payment processed successfully',
            transaction_id: transaction.id
          });
        } else {
          console.warn(`⚠️ Transação não encontrada para payment_id: ${paymentId}`);
          console.warn('Possível pagamento duplicado ou transação já processada');
        }
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        // Marcar como falha se rejeitado
        await c.env.DB.prepare(`
          UPDATE transactions 
          SET status = 'failed', updated_at = CURRENT_TIMESTAMP
          WHERE type = 'deposit' 
          AND status = 'pending'
          AND json_extract(metadata, '$.mp_id') = ?
        `).bind(String(paymentId)).run();
        
        console.log(`❌ Pagamento rejeitado/cancelado: ${paymentId}`);
      }
    }
    
    // V104 SPRINT 2: Detectar chargebacks
    if (body.action === 'payment.refunded' || body.type === 'chargeback') {
      const paymentId = body.data?.id || body.payment_id;
      
      if (!paymentId) {
        console.warn('⚠️ Webhook de chargeback sem payment ID');
        return c.json({ error: 'Payment ID missing' }, 400);
      }
      
      console.log(`🚨 CHARGEBACK DETECTADO: Payment ${paymentId}`);
      
      // Buscar transação relacionada
      const transaction = await c.env.DB.prepare(`
        SELECT t.*, c.id as call_id, c.streamer_id, c.duration_seconds
        FROM transactions t
        LEFT JOIN calls c ON t.id = c.id
        WHERE t.type = 'deposit'
        AND json_extract(t.metadata, '$.mp_id') = ?
        LIMIT 1
      `).bind(String(paymentId)).first() as any;
      
      if (transaction) {
        // Verificar se chargeback já existe
        const existing = await c.env.DB.prepare(
          'SELECT id FROM chargebacks WHERE payment_id = ?'
        ).bind(String(paymentId)).first();
        
        if (!existing) {
          // Criar registro de chargeback
          await c.env.DB.prepare(`
            INSERT INTO chargebacks (
              payment_id, transaction_id, user_id, streamer_id, call_id,
              amount, reason, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
          `).bind(
            String(paymentId),
            transaction.id,
            transaction.user_id,
            transaction.streamer_id,
            transaction.call_id,
            transaction.amount,
            body.reason || 'Chargeback initiated by payment provider'
          ).run();
          
          // Marcar chamada com chargeback
          if (transaction.call_id) {
            await c.env.DB.prepare(
              'UPDATE calls SET has_chargeback = 1 WHERE id = ?'
            ).bind(transaction.call_id).run();
          }
          
          console.log(`📝 Chargeback registrado: R$ ${transaction.amount} - User ${transaction.user_id}`);
          
          // TODO: Enviar alerta urgente para admin via email/notificação
          // await sendChargebackAlert(transaction);
        }
      }
    }
    
    // Sempre retornar 200 para o MP não reenviar
    return c.json({ received: true });
    
  } catch (e: any) {
    console.error('❌ Webhook error:', e.message, e.stack);
    // Mesmo com erro, retornar 200 para evitar spam de notificações
    return c.json({ error: 'Internal error', received: true }, 200);
  }
});

// ============================================
// ENDPOINT DE TESTE (OPCIONAL - REMOVER EM PROD)
// ============================================

webhooks.get('/test', (c) => {
  return c.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString()
  });
});

export default webhooks;
