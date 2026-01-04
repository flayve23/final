import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  JWT_SECRET: string
}

const kyc = new Hono<{ Bindings: Bindings }>()

// Middleware: Verificar autenticação
kyc.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 403)
  
  c.set('user', payload)
  await next()
})

// V104: Submeter documentos de KYC
kyc.post('/submit', async (c) => {
  try {
    const user = c.get('user')
    const { full_name, cpf, birth_date, document_front, document_back, selfie } = await c.req.json()

    // Validações
    if (!full_name || !cpf || !birth_date) {
      return c.json({ error: 'Dados obrigatórios faltando' }, 400)
    }

    // Validar idade (18+)
    const birthYear = new Date(birth_date).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    
    if (age < 18) {
      return c.json({ error: 'Você precisa ter 18 anos ou mais' }, 400)
    }

    // Verificar se já existe KYC
    const existing = await c.env.DB.prepare(
      'SELECT id FROM kyc_verifications WHERE user_id = ?'
    ).bind(user.sub).first()

    if (existing) {
      return c.json({ error: 'Você já possui uma verificação em andamento' }, 400)
    }

    // Upload dos documentos para R2 (se fornecidos como base64)
    let documentFrontUrl = null
    let documentBackUrl = null
    let selfieUrl = null

    if (document_front && document_front.startsWith('data:image/')) {
      const frontKey = `kyc/${user.sub}/document_front_${Date.now()}.jpg`
      const frontData = document_front.split(',')[1]
      await c.env.BUCKET.put(frontKey, Buffer.from(frontData, 'base64'), {
        httpMetadata: { contentType: 'image/jpeg' }
      })
      documentFrontUrl = `/api/storage/file/kyc/${user.sub}/document_front_${Date.now()}.jpg`
    }

    if (document_back && document_back.startsWith('data:image/')) {
      const backKey = `kyc/${user.sub}/document_back_${Date.now()}.jpg`
      const backData = document_back.split(',')[1]
      await c.env.BUCKET.put(backKey, Buffer.from(backData, 'base64'), {
        httpMetadata: { contentType: 'image/jpeg' }
      })
      documentBackUrl = `/api/storage/file/kyc/${user.sub}/document_back_${Date.now()}.jpg`
    }

    if (selfie && selfie.startsWith('data:image/')) {
      const selfieKey = `kyc/${user.sub}/selfie_${Date.now()}.jpg`
      const selfieData = selfie.split(',')[1]
      await c.env.BUCKET.put(selfieKey, Buffer.from(selfieData, 'base64'), {
        httpMetadata: { contentType: 'image/jpeg' }
      })
      selfieUrl = `/api/storage/file/kyc/${user.sub}/selfie_${Date.now()}.jpg`
    }

    // Inserir verificação
    const result = await c.env.DB.prepare(`
      INSERT INTO kyc_verifications (
        user_id, full_name, cpf, 
        document_front_url, document_back_url, selfie_url,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      user.sub, 
      full_name, 
      cpf,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl
    ).run()

    // Atualizar birth_date no usuário
    await c.env.DB.prepare('UPDATE users SET birth_date = ? WHERE id = ?')
      .bind(birth_date, user.sub)
      .run()

    console.log(`✅ KYC submitted: user ${user.sub}`)

    return c.json({ 
      success: true, 
      message: 'Documentos enviados com sucesso! Aguarde a análise.',
      kyc_id: result.meta.last_row_id
    })

  } catch (e: any) {
    console.error('❌ KYC submit error:', e)
    return c.json({ error: `Failed to submit KYC: ${e.message}` }, 500)
  }
})

// V104: Verificar status do KYC
kyc.get('/status', async (c) => {
  try {
    const user = c.get('user')
    
    const kycData = await c.env.DB.prepare(`
      SELECT status, admin_notes, created_at, reviewed_at
      FROM kyc_verifications
      WHERE user_id = ?
    `).bind(user.sub).first()

    if (!kycData) {
      return c.json({ status: 'not_submitted' })
    }

    return c.json(kycData)

  } catch (e: any) {
    console.error('❌ KYC status error:', e)
    return c.json({ error: `Failed to get KYC status: ${e.message}` }, 500)
  }
})

export default kyc
