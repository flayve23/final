// auth-utils.ts - V104 SECURE VERSION
// Password hashing and Token utils using Web Crypto API (Edge compatible)

// ============================================
// PASSWORD HASHING (Mantido - Funcionando OK)
// ============================================
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  return base64UrlEncode(new Uint8Array(exported));
}

export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password, salt);
  return newHash === hash;
}

// ============================================
// JWT COM HMAC-SHA256 REAL (NOVO - SEGURO)
// ============================================

function base64UrlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  // Adicionar padding se necessário
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function createSessionToken(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  
  // Header
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  
  // Payload com expiração e issued at
  const now = Math.floor(Date.now() / 1000);
  const data = { 
    ...payload, 
    iat: now,
    exp: now + (7 * 24 * 60 * 60) // 7 dias
  };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(data)));
  
  // Message = header + payload
  const message = `${encodedHeader}.${encodedPayload}`;
  
  // HMAC-SHA256 Signature (SEGURO!)
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  
  const signature = base64UrlEncode(new Uint8Array(signatureBuffer));
  
  return `${message}.${signature}`;
}

export async function verifySessionToken(token: string, secret?: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verificar assinatura SE secret fornecido (para validação completa)
    if (secret) {
      const message = `${encodedHeader}.${encodedPayload}`;
      const encoder = new TextEncoder();
      
      const keyData = encoder.encode(secret);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const signatureBytes = base64UrlDecode(encodedSignature);
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        encoder.encode(message)
      );
      
      if (!isValid) {
        console.warn('⚠️ JWT signature verification failed');
        return null;
      }
    }
    
    // Decodificar payload
    const payloadBytes = base64UrlDecode(encodedPayload);
    const payloadString = new TextDecoder().decode(payloadBytes);
    const data = JSON.parse(payloadString);
    
    // Verificar expiração
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && now > data.exp) {
      console.warn('⚠️ JWT token expired');
      return null;
    }
    
    // ⚠️ V104: Bloquear usuários banidos
    if (data.role === 'banned') {
      console.warn('⚠️ Banned user attempted access');
      return null;
    }
    
    return data;
  } catch (e) {
    console.error('❌ JWT Verification Error:', e);
    return null;
  }
}
