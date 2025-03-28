"use client"

import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import { useCurrentAccount, useSignPersonalMessage, ConnectButton, useSuiClient } from "@mysten/dapp-kit"
import { createTuskyClient } from "@/lib/tusky/client"
import { formatAddress } from "@mysten/sui.js/utils"
import { useTusky } from "@/hooks/useTusky"

export function SuiWalletLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const account = useCurrentAccount()
  const { mutate: signPersonalMessage } = useSignPersonalMessage()
  const suiClient = useSuiClient()
  const { setClient, isSignedIn, setIsSignedIn } = useTusky()

  // ウォレット接続時にSUIのバランスを取得
  useEffect(() => {
    const fetchBalance = async () => {
      if (account) {
        try {
          const { totalBalance } = await suiClient.getBalance({
            owner: account.address,
            coinType: "0x2::sui::SUI"
          })
          // SUIをフォーマットする（1 SUI = 10^9）
          const formattedBalance = (Number(totalBalance) / 10**9).toFixed(4)
          setBalance(formattedBalance)
        } catch (error) {
          logger.error('[Auth] Failed to fetch SUI balance', { error })
          setBalance("Error")
        }
      }
    }
    
    fetchBalance()
  }, [account, suiClient])

  const handleSuiWalletLogin = async () => {
    try {
      setIsLoading(true)
      logger.info('[Auth] Starting Tusky Sui Wallet login')

      if (!account) {
        logger.error('[Auth] No Sui wallet account found')
        throw new Error('Sui Wallet is not connected')
      }

      // Sui Walletのアカウント情報とサイン関数を使ってTuskyクライアントを初期化
      const tuskyClient = await createTuskyClient(signPersonalMessage, account)
      setClient(tuskyClient)
      
      // Tuskyにサインイン (これによりウォレットのサイン要求が表示される)
      await tuskyClient.auth.signIn()
      
      setIsSignedIn(true)
      logger.info('[Auth] Successfully signed in with Tusky', {
        address: account.address
      })

    } catch (error) {
      logger.error('[Auth] Login process failed', { error })
    } finally {
      setIsLoading(false)
    }
  }

  // アカウントが接続されていない場合は、ConnectButtonを表示
  if (!account) {
    return (
      <ConnectButton connectText="Connect Sui Wallet" />
    );
  }

  // アカウントが接続されているが、Tuskyにサインインしていない場合
  if (!isSignedIn) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-500 mb-1">
          Wallet connected: {formatAddress(account.address)} ({balance} SUI)
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={handleSuiWalletLogin}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            "Signing in with Tusky..."
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Authenticate with Tusky
            </>
          )}
        </Button>
      </div>
    );
  }

  // Tuskyにもサインイン済みの場合
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-green-600">
        Authentication Complete ✓
      </div>
      <div className="text-sm">
        Address: {formatAddress(account.address)}
      </div>
      <div className="text-sm">
        Balance: {balance} SUI
      </div>
    </div>
  );
}
