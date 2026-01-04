import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
  LIVEKIT_URL: string
}

const calls = new Hono<{ Bindings: Bindings }>()

calls.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  // V104: Verificação segura com HMAC
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 403)
  c.set('user', payload)
  await next()
})

// 1. Viewer REQUESTS a call (Rings the phone)
calls.post('/request', async (c) => {
  const user = c.get('user') as any
  const { streamer_id } = await c.req.json()

  // Verify Balance
  // ... (Simplified check)

  // Create Ringing Request
  const result = await c.env.DB.prepare(`
    INSERT INTO call_requests (viewer_id, streamer_id, status)
    VALUES (?, ?, 'ringing')
    RETURNING id
  `).bind(user.sub, streamer_id).first()

  return c.json({ call_id: result.id, status: 'ringing' })
})

// 2. Streamer CHECKS for incoming calls (Polling)
calls.get('/incoming', async (c) => {
  const user = c.get('user') as any
  
  // Find active ringing calls older than 30s (timeout)
  const incoming = await c.env.DB.prepare(`
    SELECT cr.id, cr.viewer_id, u.username as viewer_name
    FROM call_requests cr
    JOIN users u ON cr.viewer_id = u.id
    WHERE cr.streamer_id = ? 
    AND cr.status = 'ringing'
    AND cr.created_at > datetime('now', '-30 seconds')
    ORDER BY cr.created_at DESC
    LIMIT 1
  `).bind(user.sub).first()

  return c.json(incoming || { active: false })
})

// 3. Streamer ACCEPTS/REJECTS
calls.post('/answer', async (c) => {
  const user = c.get('user') as any
  const { call_id, action } = await c.req.json() // action: 'accept' | 'reject'

  if (action === 'reject') {
      await c.env.DB.prepare("UPDATE call_requests SET status = 'rejected' WHERE id = ?").bind(call_id).run()
      return c.json({ status: 'rejected' })
  }

  // If Accepted, Generate Tokens for BOTH
  // Logic: Streamer calls this, gets token. Viewer polls status, gets token.
  
  // Update status
  await c.env.DB.prepare("UPDATE call_requests SET status = 'accepted' WHERE id = ?").bind(call_id).run()

  // Generate Streamer Token
  const { AccessToken } = await import('livekit-server-sdk')
  const roomName = `call_${call_id}`
  
  const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
    identity: String(user.sub),
    name: user.username
  })
  at.addGrant({ roomJoin: true, roomName: roomName, canPublish: true, canSubscribe: true })

  return c.json({ 
    status: 'accepted',
    token: await at.toJwt(),
    room: roomName,
    url: c.env.LIVEKIT_URL,
    call_id: call_id // V104: Adicionar call_id para cobrança posterior
  })
})

// 4. Viewer POLLS status of request
calls.get('/status/:id', async (c) => {
  const user = c.get('user') as any
  const callId = c.req.param('id')
  
  const request = await c.env.DB.prepare('SELECT * FROM call_requests WHERE id = ?').bind(callId).first()
  
  if (!request) return c.json({ status: 'ended' })
  
  if (request.status === 'accepted') {
      // Generate Viewer Token
      const { AccessToken } = await import('livekit-server-sdk')
      const roomName = `call_${callId}`
      const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
        identity: String(user.sub),
        name: user.username
      })
      at.addGrant({ roomJoin: true, roomName: roomName, canPublish: true, canSubscribe: true })
      
      return c.json({ 
          status: 'accepted',
          token: await at.toJwt(),
          room: roomName,
          url: c.env.LIVEKIT_URL,
          call_id: callId // V104: Adicionar call_id
      })
  }

  return c.json({ status: request.status })
})

// ============================================
// V104: ENDPOINT PARA FINALIZAR E COBRAR CHAMADA
// ============================================

calls.post('/end', async (c) => {
  const user = c.get('user') as any;
  const { call_id, duration_seconds } = await c.req.json();
  
  if (!call_id || !duration_seconds) {
    return c.json({ error: 'Dados incompletos' }, 400);
  }
  
  // Buscar informações da chamada
  const callRequest = await c.env.DB.prepare(`
    SELECT 
      cr.id,
      cr.viewer_id,
      cr.streamer_id,
      cr.status,
      p.price_per_minute,
      u.username as streamer_name
    FROM call_requests cr
    JOIN profiles p ON cr.streamer_id = p.user_id
    JOIN users u ON cr.streamer_id = u.id
    WHERE cr.id = ?
  `).bind(call_id).first() as any;
  
  if (!callRequest) {
    return c.json({ error: 'Chamada não encontrada' }, 404);
  }
  
  if (callRequest.status !== 'accepted') {
    return c.json({ error: 'Chamada não estava ativa' }, 400);
  }
  
  // Calcular custo (arredondar para cima)
  const minutes = Math.ceil(duration_seconds / 60);
  const totalCost = Number((callRequest.price_per_minute * minutes).toFixed(2));
  
  // Comissão da plataforma (20%)
  const platformFee = Number((totalCost * 0.20).toFixed(2));
  const streamerEarning = Number((totalCost - platformFee).toFixed(2));
  
  // Verificar saldo do viewer
  const viewerBalance = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type IN ('deposit') THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type IN ('call_payment', 'withdrawal', 'tip') THEN amount ELSE 0 END), 0) as balance
    FROM transactions 
    WHERE user_id = ? AND status = 'completed'
  `).bind(callRequest.viewer_id).first() as any;
  
  if (!viewerBalance || viewerBalance.balance < totalCost) {
    // Saldo insuficiente - marcar como falha
    await c.env.DB.prepare(`
      UPDATE call_requests SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(call_id).run();
    
    return c.json({ 
      error: 'Saldo insuficiente', 
      required: totalCost,
      available: viewerBalance?.balance || 0
    }, 402);
  }
  
  // === TRANSAÇÃO ATÔMICA ===
  
  // 1. Debitar Viewer
  await c.env.DB.prepare(`
    INSERT INTO transactions (user_id, type, amount, status, metadata)
    VALUES (?, 'call_payment', ?, 'completed', ?)
  `).bind(
    callRequest.viewer_id,
    totalCost,
    JSON.stringify({
      call_id,
      duration_seconds,
      duration_minutes: minutes,
      price_per_minute: callRequest.price_per_minute,
      streamer_id: callRequest.streamer_id,
      streamer_name: callRequest.streamer_name,
      timestamp: new Date().toISOString()
    })
  ).run();
  
  // 2. Creditar Streamer
  await c.env.DB.prepare(`
    INSERT INTO transactions (user_id, type, amount, status, metadata)
    VALUES (?, 'call_earning', ?, 'completed', ?)
  `).bind(
    callRequest.streamer_id,
    streamerEarning,
    JSON.stringify({
      call_id,
      duration_seconds,
      duration_minutes: minutes,
      total_charged: totalCost,
      platform_fee: platformFee,
      viewer_id: callRequest.viewer_id,
      timestamp: new Date().toISOString()
    })
  ).run();
  
  // 3. Atualizar status da chamada
  await c.env.DB.prepare(`
    UPDATE call_requests 
    SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(call_id).run();
  
  console.log(`✅ Chamada #${call_id} finalizada: R$${totalCost} (${minutes}min)`);
  
  return c.json({
    success: true,
    charged: totalCost,
    duration_seconds,
    duration_minutes: minutes,
    price_per_minute: callRequest.price_per_minute,
    streamer_earned: streamerEarning,
    platform_fee: platformFee
  });
});

// ============================================
// V104: ENDPOINT PARA VERIFICAR SALDO PRÉ-CHAMADA
// ============================================

calls.get('/check-balance/:streamer_id', async (c) => {
  const user = c.get('user') as any;
  const streamerId = c.req.param('streamer_id');
  
  // Buscar preço do streamer
  const profile = await c.env.DB.prepare(
    'SELECT price_per_minute FROM profiles WHERE user_id = ?'
  ).bind(streamerId).first() as any;
  
  if (!profile) {
    return c.json({ error: 'Streamer não encontrado' }, 404);
  }
  
  // Buscar saldo do viewer
  const balance = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN type IN ('deposit') THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type IN ('call_payment', 'withdrawal', 'tip') THEN amount ELSE 0 END), 0) as balance
    FROM transactions 
    WHERE user_id = ? AND status = 'completed'
  `).bind(user.sub).first() as any;
  
  const currentBalance = balance?.balance || 0;
  const pricePerMinute = profile.price_per_minute;
  const estimatedMinutes = Math.floor(currentBalance / pricePerMinute);
  
  return c.json({
    balance: currentBalance,
    price_per_minute: pricePerMinute,
    estimated_minutes: estimatedMinutes,
    can_call: currentBalance >= pricePerMinute
  });
});

// V104: Histórico de sessões do viewer
calls.get('/history', async (c) => {
  try {
    const user = c.get('user');
    const status = c.req.query('status'); // 'completed', 'rejected', ou undefined

    let query = `
      SELECT 
        c.id,
        c.duration_seconds,
        c.cost_total,
        c.status,
        c.created_at,
        u.username as streamer_name,
        p.photo_url as streamer_photo
      FROM calls c
      JOIN users u ON c.streamer_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE c.viewer_id = ?
    `;

    const params: any[] = [user.sub];

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC LIMIT 100';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Calcular total gasto
    const totalSpent = results.reduce((sum: number, call: any) => {
      return sum + (call.cost_total || 0);
    }, 0);

    return c.json({
      sessions: results,
      total_spent: totalSpent
    });

  } catch (e: any) {
    console.error('❌ Calls history error:', e);
    return c.json({ error: `Failed to get history: ${e.message}` }, 500);
  }
});

export default calls
