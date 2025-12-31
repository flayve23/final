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
  const payload = await verifySessionToken(token, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 403)
  c.set('user', payload)
  await next()
})

// RC1-FIX: Upload Base64 (usado pelo perfil)
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

    // Validação do formato
    const mimeMatch = image.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,/)
    if (!mimeMatch) {
      return c.json({ 
        error: 'Formato de imagem inválido',
        allowed: ['PNG', 'JPEG', 'JPG', 'WebP', 'GIF']
      }, 400)
    }

    const mimeType = mimeMatch[1]
    const extension = mimeMatch[2]

    // Validação de tamanho
    const base64Data = image.split(',')[1]
    if (!base64Data) {
      return c.json({ error: 'Dados de imagem inválidos' }, 400)
    }

    const sizeInBytes = (base64Data.length * 3) / 4
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (sizeInBytes > maxSize) {
      return c.json({ 
        error: 'Imagem muito grande',
        max_size: '5MB',
        your_size: `${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`
      }, 413)
    }

    // Validação de pasta
    const allowedFolders = ['avatars', 'stories', 'documents']
    if (!allowedFolders.includes(folder)) {
      return c.json({ 
        error: 'Pasta inválida',
        allowed: allowedFolders
      }, 400)
    }

    // Decode e upload
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    const key = `${folder}/${user.sub}_${Date.now()}.${extension}`

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

// RC1-FIX: Upload de Stories via FormData (usado pelo StreamerDashboard)
storage.post('/upload/stories', async (c) => {
  const user = c.get('user') as any
  
  try {
    if (!c.env.BUCKET) {
      return c.json({ error: 'R2 Bucket not configured' }, 500)
    }

    // Parse FormData
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400)
    }

    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: 'Tipo de arquivo inválido',
        allowed: allowedTypes
      }, 400)
    }

    // Validar tamanho (max 10MB para stories)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return c.json({ 
        error: 'Arquivo muito grande',
        max_size: '10MB',
        your_size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      }, 413)
    }

    // Gerar nome único
    const extension = file.name.split('.').pop() || 'jpg'
    const key = `stories/${user.sub}_${Date.now()}.${extension}`

    // Upload para R2
    const arrayBuffer = await file.arrayBuffer()
    await c.env.BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type }
    })

    console.log(`✅ Story Upload: ${key} (${(file.size / 1024).toFixed(2)}KB) por user ${user.sub}`)

    return c.json({ 
      success: true, 
      url: `/api/storage/file/${key}`,
      size: file.size,
      type: file.type
    })
    
  } catch (e: any) {
    console.error('❌ Story upload error:', e)
    return c.json({ error: `Upload failed: ${e.message}` }, 500)
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
  headers.set('cache-control', 'public, max-age=31536000')
  
  return new Response(object.body, { headers })
})

export default storage
