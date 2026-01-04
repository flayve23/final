// functions/server/routes/premium.ts
// Sistema de Plano Premium - FLAYVE

import { Hono } from 'hono';

const app = new Hono();

// ===========================
// PLANOS DISPONÍVEIS
// ===========================

const PREMIUM_PLANS = {
  monthly: {
    id: 'premium_monthly',
    name: 'Premium Mensal',
    price: 29.90,
    duration_days: 30,
    benefits: [
      'Taxa da plataforma: 0% (ao invés de 25%)',
      'Destaque no topo da busca',
      'Badge premium no perfil',
      'Limites de saque aumentados',
      'Prioridade no suporte',
      'Analytics avançado',
      'Acesso a features exclusivas'
    ]
  },
  yearly: {
    id: 'premium_yearly',
    name: 'Premium Anual',
    price: 299.90,
    duration_days: 365,
    discount: '16% OFF',
    benefits: [
      'Todos os benefícios do plano mensal',
      '2 meses grátis (12 meses pelo preço de 10)',
      'Acesso antecipado a novas features',
      'Gerente de conta dedicado'
    ]
  }
};

// ===========================
// LISTAR PLANOS
// ===========================

app.get('/api/premium/plans', async (c) => {
  return c.json({ plans: PREMIUM_PLANS });
});

// ===========================
// ASSINAR PLANO (criar checkout Mercado Pago)
// ===========================

app.post('/api/premium/subscribe', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const { plan_type } = await c.req.json();

    if (!plan_type || !PREMIUM_PLANS[plan_type]) {
      return c.json({ error: 'Plano inválido' }, 400);
    }

    const plan = PREMIUM_PLANS[plan_type];

    // Verificar se já é premium
    const user = await c.env.DB.prepare(`
      SELECT is_premium, premium_until FROM users WHERE id = ?
    `).bind(userId).first();

    if (user?.is_premium && user.premium_until > Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Você já tem um plano premium ativo' }, 400);
    }

    // Buscar dados do usuário
    const userDetails = await c.env.DB.prepare(`
      SELECT email, display_name, cpf FROM users WHERE id = ?
    `).bind(userId).first();

    // Criar preferência de pagamento no Mercado Pago
    // Nota: Usar SDK do Mercado Pago real em produção
    const preferenceData = {
      items: [{
        title: plan.name,
        description: 'Assinatura Premium FLAYVE',
        quantity: 1,
        unit_price: plan.price,
        currency_id: 'BRL'
      }],
      payer: {
        email: userDetails?.email,
        name: userDetails?.display_name
      },
      back_urls: {
        success: `${c.env.FRONTEND_URL}/premium/success`,
        failure: `${c.env.FRONTEND_URL}/premium/failure`,
        pending: `${c.env.FRONTEND_URL}/premium/pending`
      },
      auto_return: 'approved',
      notification_url: `${c.env.API_URL}/api/premium/webhook`,
      metadata: {
        user_id: userId,
        plan_type,
        type: 'premium_subscription'
      }
    };

    // TODO: Chamar API do Mercado Pago
    // const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${c.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(preferenceData)
    // });
    // const preference = await response.json();

    // Mock para desenvolvimento
    const mockPreference = {
      id: `pref_${Date.now()}`,
      init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mock_${Date.now()}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=mock_${Date.now()}`
    };

    return c.json({
      preference_id: mockPreference.id,
      checkout_url: mockPreference.init_point,
      plan: plan
    });

  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return c.json({ error: 'Erro ao criar assinatura' }, 500);
  }
});

// ===========================
// WEBHOOK MERCADO PAGO (processar pagamento)
// ===========================

app.post('/api/premium/webhook', async (c) => {
  try {
    const body = await c.req.json();
    
    // Validar webhook do Mercado Pago
    // TODO: Implementar validação de assinatura

    if (body.type === 'payment') {
      const paymentId = body.data.id;

      // Buscar detalhes do pagamento
      // TODO: Chamar API do Mercado Pago
      // const payment = await getPaymentDetails(paymentId);

      // Mock para desenvolvimento
      const payment = {
        id: paymentId,
        status: 'approved',
        metadata: {
          user_id: 'user_123',
          plan_type: 'monthly',
          type: 'premium_subscription'
        }
      };

      if (payment.metadata?.type === 'premium_subscription' && payment.status === 'approved') {
        const userId = payment.metadata.user_id;
        const planType = payment.metadata.plan_type;
        const plan = PREMIUM_PLANS[planType];

        const timestamp = Math.floor(Date.now() / 1000);
        const expiresAt = timestamp + (plan.duration_days * 24 * 60 * 60);

        // Ativar premium
        await c.env.DB.prepare(`
          UPDATE users
          SET is_premium = 1,
              premium_since = ?,
              premium_until = ?
          WHERE id = ?
        `).bind(timestamp, expiresAt, userId).run();

        // Registrar assinatura
        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await c.env.DB.prepare(`
          INSERT INTO premium_subscriptions (
            id, user_id, plan_type, amount, status, payment_method, payment_id,
            started_at, expires_at
          ) VALUES (?, ?, ?, ?, 'active', 'mercado_pago', ?, ?, ?)
        `).bind(
          subscriptionId,
          userId,
          planType,
          plan.price,
          paymentId,
          timestamp,
          expiresAt
        ).run();

        // Criar notificação
        await c.env.DB.prepare(`
          INSERT INTO notifications (
            id, user_id, type, title, message, created_at
          ) VALUES (?, ?, 'premium_activated', ?, ?, ?)
        `).bind(
          `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          'Premium Ativado! 🎉',
          `Seu plano ${plan.name} está ativo. Aproveite todos os benefícios!`,
          timestamp
        ).run();

        console.log(`Premium ativado para usuário ${userId}`);
      }
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return c.json({ error: 'Erro no webhook' }, 500);
  }
});

// ===========================
// STATUS DA ASSINATURA
// ===========================

app.get('/api/premium/status', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const user = await c.env.DB.prepare(`
      SELECT is_premium, premium_since, premium_until FROM users WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return c.json({ error: 'Usuário não encontrado' }, 404);
    }

    const now = Math.floor(Date.now() / 1000);
    const isPremiumActive = user.is_premium && user.premium_until > now;

    // Buscar assinatura ativa
    let subscription = null;
    if (isPremiumActive) {
      subscription = await c.env.DB.prepare(`
        SELECT id, plan_type, amount, started_at, expires_at, status
        FROM premium_subscriptions
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(userId).first();
    }

    return c.json({
      is_premium: isPremiumActive,
      premium_since: user.premium_since,
      premium_until: user.premium_until,
      days_remaining: isPremiumActive ? Math.ceil((user.premium_until - now) / 86400) : 0,
      subscription: subscription || null,
      benefits: isPremiumActive ? PREMIUM_PLANS[subscription?.plan_type || 'monthly'].benefits : []
    });

  } catch (error) {
    console.error('Erro ao buscar status:', error);
    return c.json({ error: 'Erro ao buscar status' }, 500);
  }
});

// ===========================
// CANCELAR ASSINATURA
// ===========================

app.post('/api/premium/cancel', async (c) => {
  try {
    const userId = c.req.header('X-User-ID');
    if (!userId) {
      return c.json({ error: 'Não autenticado' }, 401);
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Cancelar assinatura ativa
    await c.env.DB.prepare(`
      UPDATE premium_subscriptions
      SET status = 'canceled', canceled_at = ?
      WHERE user_id = ? AND status = 'active'
    `).bind(timestamp, userId).run();

    // Nota: Não desativar premium imediatamente, deixar até expirar

    return c.json({
      success: true,
      message: 'Assinatura cancelada. Você continuará com acesso premium até o fim do período pago.'
    });

  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    return c.json({ error: 'Erro ao cancelar assinatura' }, 500);
  }
});

// ===========================
// CRON JOB: Expirar assinaturas
// ===========================

app.get('/api/premium/cron/expire', async (c) => {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Buscar assinaturas expiradas
    const expired = await c.env.DB.prepare(`
      SELECT user_id FROM users
      WHERE is_premium = 1 AND premium_until < ?
    `).bind(now).all();

    for (const user of (expired.results || [])) {
      // Desativar premium
      await c.env.DB.prepare(`
        UPDATE users
        SET is_premium = 0, premium_since = NULL, premium_until = NULL
        WHERE id = ?
      `).bind(user.user_id).run();

      // Atualizar assinatura
      await c.env.DB.prepare(`
        UPDATE premium_subscriptions
        SET status = 'expired'
        WHERE user_id = ? AND status = 'active'
      `).bind(user.user_id).run();

      // Notificar
      await c.env.DB.prepare(`
        INSERT INTO notifications (
          id, user_id, type, title, message, created_at
        ) VALUES (?, ?, 'premium_expired', ?, ?, ?)
      `).bind(
        `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user.user_id,
        'Premium Expirou',
        'Seu plano premium expirou. Renove para continuar aproveitando os benefícios!',
        now
      ).run();
    }

    return c.json({
      success: true,
      expired_count: expired.results?.length || 0
    });

  } catch (error) {
    console.error('Erro no cron de expiração:', error);
    return c.json({ error: 'Erro no cron' }, 500);
  }
});

export default app;
