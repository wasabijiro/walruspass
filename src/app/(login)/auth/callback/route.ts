import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/api/client';
import { logger } from '@/lib/logger';

/**
 * Supabase認証コールバックを処理するルートハンドラ
 * @route GET /auth/callback
 * @param request - Request with authorization code
 * @returns Redirect to home page
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    logger.info('Auth callback received', { code })

    if (code) {
      logger.info('Exchanging auth code for session')
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        logger.error('Failed to exchange code for session', { error })
      } else if (session) {
        // セッショントークンをログ出力（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Auth session created', {
            accessToken: session.access_token,
            tokenPreview: `${session.access_token.slice(0, 10)}...`
          })
        }
        logger.info('Authentication successful', {
          userId: session.user.id
        })
      }
    }

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    logger.error('Unexpected error in auth callback', { error })
    return NextResponse.redirect(new URL('/', request.url));
  }
}
