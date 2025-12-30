import { Hono } from 'hono'
import { verifySessionToken } from '../auth-utils'

type Bindings = { 
  BUCKET: R2Bucket
  JWT_SECRET: string
}

const storage = new Hono<{ Bindings: Bindings }>()

storage.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.split(' ')[1]
  // V104: Verificação segura
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 403)
  c.set('user', payload)
  await next()
})

// V104: Upload com validações de segurança
storage.post('/upload-base64', async (c) => {
  const user = c.get('user') as any
  
  try {
    const { image, folder } = await c.req.json()
    
    if (!image || !folder) {
      return c.json({ error: 'Missing image data' }, 400)
    }
    
    if (!c.env.BUCKET) {
      return c.json({ error: 'R2 Bucket not configured' }, 500)
    }

    // V104: Validação 1 - Verificar formato do data URL
    const mimeMatch = image.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,/)
    if (!mimeMatch) {
      return c.json({ 
        error: 'Formato de imagem inválido',
        allowed: ['PNG', 'JPEG', 'JPG', 'WebP', 'GIF']
      }, 400)
    }

    const mimeType = mimeMatch[1]
    const extension = mimeMatch[2]

    // V104: Validação 2 - Tamanho máximo (5MB)
    const base64Data = image.split(',')[1]
    if (!base64Data) {
      return c.json({ error: 'Dados de imagem inválidos' }, 400)
    }

    const sizeInBytes = (base64Data.length * 3) / 4 // Aproximação do tamanho real
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (sizeInBytes > maxSize) {
      return c.json({ 
        error: 'Imagem muito grande',
        max_size: '5MB',
        your_size: `${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`
      }, 413)
    }

    // V104: Validação 3 - Folder permitido
    const allowedFolders = ['avatars', 'stories', 'documents']
    if (!allowedFolders.includes(folder)) {
      return c.json({ 
        error: 'Pasta inválida',
        allowed: allowedFolders
      }, 400)
    }

    // Decode Base64
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    
    // Gerar nome único
    const key = `${folder}/${user.sub}_${Date.now()}.${extension}`

    // Upload para R2
    await c.env.BUCKET.put(key, binaryData, {
      httpMetadata: { contentType: mimeType }
    })

    console.log(`✅ Upload: ${key} (${(sizeInBytes / 1024).toFixed(2)}KB) por user ${user.sub}`)

    return c.json({ 
      success: true, 
      url: `/api/storage/file/${key}`,
      size: sizeInBytes,
      type: mimeType
    })
    
  } catch (e: any) {
    console.error('❌ Upload error:', e.message)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

// Servir arquivos
storage.get('/file/:folder/:filename', async (c) => {
  if (!c.env.BUCKET) return c.json({ error: 'Storage not configured' }, 500)
  
  const key = `${c.req.param('folder')}/${c.req.param('filename')}`
  const object = await c.env.BUCKET.get(key)
  
  if (!object) return c.json({ error: 'File not found' }, 404)
  
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000') // 1 ano
  
  return new Response(object.body, { headers })
})

export default storage
