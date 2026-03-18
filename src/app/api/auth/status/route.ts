import { NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';
import { getChannelInfo } from '@/lib/youtube-api';

export async function GET() {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json({ authenticated: false });
    }

    // Try to fetch channel name to verify the token actually works
    try {
      const channelInfo = await getChannelInfo(accessToken);
      return NextResponse.json({
        authenticated: true,
        channelName: channelInfo.channelName,
        channelThumbnail: channelInfo.channelThumbnail,
      });
    } catch {
      // Token exists but API call failed — might be revoked
      return NextResponse.json({ authenticated: false });
    }
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
