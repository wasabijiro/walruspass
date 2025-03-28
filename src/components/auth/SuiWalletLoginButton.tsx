"use client"

import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import { useState } from "react"
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit"
import { createTuskyClient } from "@/lib/tusky/client"

export function SuiWalletLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const account = useCurrentAccount()
  const { mutate: signPersonalMessage } = useSignPersonalMessage()

  const handleSuiWalletLogin = async () => {
    try {
      setIsLoading(true)
      logger.info('[Auth] Starting Tusky Sui Wallet login')

      if (!account) {
        logger.error('[Auth] No Sui wallet account found')
        throw new Error('Sui Walletが接続されていません')
      }

      // Sui Walletのアカウント情報とサイン関数を使ってTuskyクライアントを初期化
      const tuskyClient = await createTuskyClient(signPersonalMessage, account)
      
      // Tuskyにサインイン (これによりウォレットのサイン要求が表示される)
      await tuskyClient.auth.signIn()
      
      logger.info('[Auth] Successfully signed in with Sui wallet', {
        address: account.address
      })

    } catch (error) {
      logger.error('[Auth] Login process failed', { error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleSuiWalletLogin}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? (
        "接続中..."
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Sui Walletで接続
        </>
      )}
    </Button>
  )
}