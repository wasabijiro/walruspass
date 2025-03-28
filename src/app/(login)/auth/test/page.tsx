'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { logger } from '@/lib/logger'

export default function TestPage() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          logger.error('Failed to get session', { error })
          return
        }

        if (session) {
          logger.debug('Session found', {
            tokenPreview: `${session.access_token.slice(0, 10)}...`
          })
          setToken(session.access_token)
        } else {
          logger.info('No active session found')
        }
      } catch (error) {
        logger.error('Unexpected error getting session', { error })
      }
    }

    getSession()
  }, [])

  return (
    <div className="min-h-screen p-8">
      <Card>
        <CardHeader>
          <CardTitle>認証テスト</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">アクセストークン:</h3>
            {token ? (
              <div className="break-all bg-gray-100 p-4 rounded-md">
                <p className="font-mono text-sm">{token}</p>
              </div>
            ) : (
              <p>ログインしていません</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
