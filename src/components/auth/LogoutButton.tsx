"use client"

import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import { useState } from "react"
import { useTusky } from "@/hooks/useTusky"

export function TuskyLogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { client, setClient, setIsSignedIn } = useTusky()

  const handleTuskySignOut = async () => {
    try {
      setIsLoading(true)
      logger.info('[Auth] Signing out from Tusky')
      
      if (!client) {
        throw new Error('Tusky client not initialized')
      }
      
      // Tuskyクライアントからサインアウト
      await client.auth.signOut()
      
      // 状態をリセット
      setClient(null)
      setIsSignedIn(false)
      
      logger.info('[Auth] Successfully signed out from Tusky')
    } catch (error) {
      logger.error('[Auth] Tusky sign out failed', { error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleTuskySignOut}
      disabled={isLoading}
      className="border-primary/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  )
}