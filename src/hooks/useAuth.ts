"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/api/client"
import { User } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 現在のセッションを取得
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)

      if (error) {
        logger.error('Failed to get session', { error })
      } else {
        logger.debug('Session retrieved', { 
          hasUser: !!session?.user 
        })
      }
    }

    // 初回読み込み時にセッションを取得
    getSession()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.info('Auth state changed', { 
        hasUser: !!session?.user 
      })
      setUser(session?.user ?? null)
    })

    // クリーンアップ関数
    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
  }
} 