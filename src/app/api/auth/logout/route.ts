import { NextResponse } from 'next/server';
import { clearTokenCookie } from '@/lib/auth';

export async function GET() {
  await clearTokenCookie();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${baseUrl}/`);
}

export async function POST() {
  await clearTokenCookie();
  return NextResponse.json({ success: true });
}
