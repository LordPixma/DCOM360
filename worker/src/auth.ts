// Authentication utilities for Cloudflare Worker
import { Env } from './types'

// Password hashing using Web Crypto API (available in Cloudflare Workers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Create PBKDF2 key
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  
  // Derive key with salt
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  )
  
  // Combine salt + hash
  const hashArray = new Uint8Array(salt.length + derivedBits.byteLength)
  hashArray.set(salt)
  hashArray.set(new Uint8Array(derivedBits), salt.length)
  
  // Convert to base64
  return btoa(String.fromCharCode(...hashArray))
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    
    // Decode base64 hash
    const hashBytes = new Uint8Array(
      atob(hash).split('').map(char => char.charCodeAt(0))
    )
    
    // Extract salt (first 16 bytes) and hash (rest)
    const salt = hashBytes.slice(0, 16)
    const storedHash = hashBytes.slice(16)
    
    // Create PBKDF2 key
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    
    // Derive key with same salt
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    )
    
    // Compare hashes
    const newHash = new Uint8Array(derivedBits)
    if (newHash.length !== storedHash.length) return false
    
    let match = true
    for (let i = 0; i < newHash.length; i++) {
      if (newHash[i] !== storedHash[i]) match = false
    }
    
    return match
  } catch (error) {
    return false
  }
}

// Generate JWT token (simple implementation for Cloudflare Workers)
export async function generateJWT(payload: any, secret: string, expiresIn: number = 24 * 60 * 60): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }
  
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  }
  
  const encoder = new TextEncoder()
  
  // Create header and payload
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  // Create signature
  const data = `${headerB64}.${payloadB64}`
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  
  return `${data}.${signatureB64}`
}

// Verify JWT token
export async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')
    
    const [headerB64, payloadB64, signatureB64] = parts
    const encoder = new TextEncoder()
    
    // Verify signature
    const data = `${headerB64}.${payloadB64}`
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const signature = new Uint8Array(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('').map(char => char.charCodeAt(0))
    )
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(data))
    if (!isValid) throw new Error('Invalid signature')
    
    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }
    
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Generate secure random token for email verification, password reset, etc.
export function generateSecureToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.toLowerCase())
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Extract user from JWT token in request
export async function getCurrentUser(request: Request, env: Env): Promise<any> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  
  try {
    const payload = await verifyJWT(token, env.JWT_SECRET || 'default-secret')
    
    // Check if session is still valid in database
    const session = await env.DB.prepare(
      'SELECT user_id FROM user_sessions WHERE token_hash = ? AND expires_at > datetime("now")'
    ).bind(await hashToken(token)).first()
    
    if (!session) {
      return null
    }
    
    // Get user details
    const user = await env.DB.prepare(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ? AND is_active = 1'
    ).bind(session.user_id).first()
    
    return user
  } catch (error) {
    return null
  }
}

// Hash token for storage in database
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return btoa(String.fromCharCode(...hashArray))
}