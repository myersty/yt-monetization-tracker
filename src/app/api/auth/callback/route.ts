import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setTokenCookie, StoredTokens } from '@/lib/auth';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Handle user denying consent
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent('Missing authorization code or state')}`
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent('Invalid state parameter — possible CSRF attack')}`
    );
  }

  // Clear the state cookie
  cookieStore.delete('oauth_state');

  // Exchange auth code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent('Server misconfiguration: missing OAuth credentials')}`
    );
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json().catch(() => ({}));
    console.error('Token exchange failed:', errorData);
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent('Failed to exchange authorization code for tokens')}`
    );
  }

  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${baseUrl}/?error=${encodeURIComponent('No access token received from Google')}`
    );
  }

  const tokens: StoredTokens = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || '',
    expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
  };

  await setTokenCookie(tokens);

  return NextResponse.redirect(`${baseUrl}/dashboard`);
}
