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
