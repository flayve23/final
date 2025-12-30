import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

// REMOVIDO: import { AccessToken } from 'livekit-server-sdk' (Isso causa o erro 500 na inicialização)

type Bindings = {
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
  LIVEKIT_URL: string
}

const livekit = new Hono<{ Bindings: Bindings }>()

livekit.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  const payload = await verifySessionToken(token)
  if (!payload) return c.json({ error: 'Invalid token' }, 401)
  c.set('user', payload)
  await next()
})

livekit.post('/token', async (c) => {
  const { roomName } = await c.req.json()
  const user = c.get('user') as any

  if (!c.env.LIVEKIT_API_KEY || !c.env.LIVEKIT_API_SECRET) {
    return c.json({ error: 'LiveKit keys missing' }, 500)
  }

  try {
    // AQUI ESTÁ O SEGREDO: Importar apenas no momento do uso
    const { AccessToken } = await import('livekit-server-sdk')

    const at = new AccessToken(c.env.LIVEKIT_API_KEY, c.env.LIVEKIT_API_SECRET, {
      identity: String(user.sub),
      name: user.username || user.email,
    })

    at.addGrant({ roomJoin: true, room: roomName })

    return c.json({ token: await at.toJwt() })
  } catch (e: any) {
    console.error('LiveKit Error:', e)
    return c.json({ error: 'Failed to generate token: ' + e.message }, 500)
  }
})

export default livekit
