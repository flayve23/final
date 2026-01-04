import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handle } from 'hono/cloudflare-pages'

// Routes
import auth from '../server/routes/auth'
import profiles from '../server/routes/profiles'
import wallet from '../server/routes/wallet'
import streamer from '../server/routes/streamer'
import admin from '../server/routes/admin'
import storage from '../server/routes/storage'
import stories from '../server/routes/stories'
import calls from '../server/routes/calls'
import interactions from '../server/routes/interactions'
import webhooks from '../server/routes/webhooks'
import kyc from '../server/routes/kyc'
import chargebacks from '../server/routes/chargebacks'
import payments from '../server/routes/payments'
import reports from '../server/routes/reports'
import notifications from '../server/routes/notifications'
import tickets from '../server/routes/tickets'
import schedule from '../server/routes/schedule'
import analytics from '../server/routes/analytics'
import favorites from '../server/routes/favorites'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
  LIVEKIT_URL: string
  SENDGRID_API_KEY: string
  ALLOWED_ORIGINS?: string // RC1: Domínios customizados (separados por vírgula)
  PUBLIC_URL?: string // RC1: URL base para webhooks
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

// RC1: CORS Dinâmico - Suporta *.pages.dev + domínios customizados
app.use('/*', cors({
  origin: (origin, c) => {
    // Origens padrão (desenvolvimento)
    const defaultOrigins = [
      'http://localhost:5173',
      'http://localhost:8788'
    ];
    
    // Origens customizadas (produção)
    const customOrigins = c.env.ALLOWED_ORIGINS 
      ? c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    const whitelist = [...defaultOrigins, ...customOrigins];
    
    // Se não há origin (requisições internas), permitir
    if (!origin) return '*';
    
    // Permitir qualquer subdomínio do Pages.dev (flayve-xyz.pages.dev, flayve.pages.dev)
    if (origin.endsWith('.pages.dev')) return origin;
    
    // Se está na whitelist, permitir
    if (whitelist.includes(origin)) return origin;
    
    // Fallback: primeiro permitido
    return whitelist[0] || '*';
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

// Mount routes
app.route('/auth', auth)
app.route('/profiles', profiles)
app.route('/wallet', wallet)
app.route('/streamer', streamer)
app.route('/admin', admin)
app.route('/storage', storage)
app.route('/stories', stories)
app.route('/calls', calls)
app.route('/interactions', interactions)
app.route('/webhooks', webhooks)
app.route('/kyc', kyc)
app.route('/chargebacks', chargebacks)
app.route('/payments', payments)
app.route('/reports', reports)
app.route('/notifications', notifications)
app.route('/tickets', tickets)
app.route('/schedule', schedule)
app.route('/analytics', analytics)
app.route('/favorites', favorites)

// LiveKit Token Endpoint
app.post('/livekit/token', async (c) => {
  try {
     const { room, username } = await c.req.json()
     if (!c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
        return c.json({ error: 'LiveKit not configured' }, 500)
     }
     
     const { AccessToken } = await import('livekit-server-sdk')
     
     const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
       identity: username,
     })
     at.addGrant({ roomJoin: true, roomName: room })
     
     return c.json({ token: await at.toJwt() })
  } catch(e: any) {
     return c.json({ error: e.message }, 500)
  }
})

// Health check
app.get('/health', (c) => c.json({ 
  status: 'ok', 
  version: 'V104-RC1',
  path: c.req.path,
  msg: 'Release Candidate 1 - Production Ready!',
  fixes: [
    'JWT HMAC-SHA256',
    'Call Billing',
    'MP Webhooks',
    'CORS Dinâmico',
    'LiveKit ICE Config',
    'Domínios Customizados'
  ]
}))

export const onRequest = handle(app)
