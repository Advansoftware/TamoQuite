import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'tamoquite-super-secret-key-12345';

export function createSession(userId: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = JSON.stringify({ userId, expires });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(b64Payload).digest('base64url');
  return `${b64Payload}.${hmac}`;
}

export function getSessionUserId(request: Request): string | null {
  let token: string | null = null;

  // Try Authorization header first (most reliable across proxies)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/cf_session=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [b64Payload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(b64Payload).digest('base64url');
  
  if (signature !== expectedSignature) return null;
  
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf-8'));
    if (Date.now() > payload.expires) return null;
    return payload.userId;
  } catch {
    return null;
  }
}