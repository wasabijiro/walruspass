"use client"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/api/client"
import { logger } from "@/lib/logger"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      setIsLoading(true)
      logger.info('Initiating sign out')
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('Sign out failed', { error })
      } else {
        logger.info('Sign out successful')
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      logger.error('Unexpected error during sign out', { error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      disabled={isLoading}
      className="text-red-600 hover:text-red-800 transition-colors"
    >
      {isLoading ? "ログアウト中..." : "ログアウト"}
    </Button>
  )
}
