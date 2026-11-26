import crypto from 'node:crypto';

interface VercelReq {
  method?: string;
  body?: { credential?: unknown } | string;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  setHeader: (name: string, value: string) => void;
  json: (payload: Record<string, unknown>) => void;
}

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  exp?: string;
}

/**
 * Server-side Google OAuth 2.0 / OIDC ID Token verifier (Vercel Serverless Function).
 * - Verifies Google's signed credential against Google's tokeninfo endpoint + configured GOOGLE_CLIENT_ID.
 * - Requires email_verified === "true" and an original @gmail.com address.
 * - Issues a short-lived signed HttpOnly; Secure; SameSite=Strict session cookie (never stored in localStorage).
 */
export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const sessionSecret = (process.env.SERVER_SESSION_SECRET || '').trim();
  if (!clientId) {
    res.status(503).json({ error: 'Google OAuth is not configured on the server yet.' });
    return;
  }

  let parsedBody: { credential?: unknown } = {};
  try {
    parsedBody = typeof req.body === 'string' ? (JSON.parse(req.body) as { credential?: unknown }) : (req.body || {});
  } catch {
    res.status(400).json({ error: 'Invalid JSON request body' });
    return;
  }

  const credential = typeof parsedBody.credential === 'string' ? parsedBody.credential.trim() : '';
  if (!credential || credential.length > 4096 || credential.split('.').length !== 3) {
    res.status(400).json({ error: 'Invalid Google credential' });
    return;
  }

  try {
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { method: 'GET' }
    );
    if (!verifyRes.ok) {
      res.status(401).json({ error: 'Invalid or expired Google sign-in token' });
      return;
    }

    const info = (await verifyRes.json()) as GoogleTokenInfo;
    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = Number(info.exp || 0);
    if (info.aud !== clientId || info.email_verified !== 'true' || !info.email || !info.sub || expSec <= nowSec) {
      res.status(401).json({ error: 'Google token verification failed' });
      return;
    }

    const email = info.email.toLowerCase();
    if (!/^[a-z0-9._%+-]{1,64}@gmail\.com$/.test(email)) {
      res.status(403).json({ error: 'Original @gmail.com account required' });
      return;
    }

    // Issue short-lived (15 min) signed HttpOnly session cookie when SERVER_SESSION_SECRET is configured
    if (sessionSecret.length >= 32) {
      const payload = Buffer.from(
        JSON.stringify({ sub: info.sub, email, exp: nowSec + 900 })
      ).toString('base64url');
      const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
      res.setHeader(
        'Set-Cookie',
        `gcu_session=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`
      );
    }

    res.status(200).json({
      verified: true,
      email,
      name: (info.name || email.split('@')[0]).slice(0, 40)
    });
  } catch {
    res.status(502).json({ error: 'Authentication verification service temporarily unavailable' });
  }
}
