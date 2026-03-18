import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'yt_auth_tokens';
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  // Derive a 32-byte key from the secret using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted token format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export type StoredTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
};

export async function setTokenCookie(tokens: StoredTokens): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(tokens));
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getTokensFromCookie(): Promise<StoredTokens | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    const decrypted = decrypt(cookie.value);
    return JSON.parse(decrypted) as StoredTokens;
  } catch {
    return null;
  }
}

export async function clearTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  };
}

/**
 * Gets a valid access token, refreshing if needed.
 * Returns the access token string or null if auth is invalid.
 * Updates the cookie if the token was refreshed.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokensFromCookie();
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  // Refresh if token expires in less than 5 minutes
  if (tokens.expires_at > now + 300) {
    return tokens.access_token;
  }

  // Token expired or expiring soon — refresh
  const refreshed = await refreshAccessToken(tokens.refresh_token);
  if (!refreshed) return null;

  const updatedTokens: StoredTokens = {
    access_token: refreshed.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: now + refreshed.expires_in,
  };
  await setTokenCookie(updatedTokens);
  return updatedTokens.access_token;
}
