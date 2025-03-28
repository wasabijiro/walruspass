"use client"

import { TuskyLogoutButton } from "@/components/auth/LogoutButton"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SuiWalletLoginButton } from "@/components/auth/SuiWalletLoginButton"
import { useTusky } from "@/hooks/useTusky"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { formatAddress } from "@mysten/sui.js/utils"
import { useEffect, useState } from "react"
import { logger } from "@/lib/logger"

export function Header() {
  const { isAuthenticated, loading } = useAuth()
  const { isSignedIn } = useTusky()
  const router = useRouter()
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const [balance, setBalance] = useState<string | null>(null)

  // SUIの残高を取得
  useEffect(() => {
    const fetchBalance = async () => {
      if (account) {
        try {
          const { totalBalance } = await suiClient.getBalance({
            owner: account.address,
            coinType: "0x2::sui::SUI"
          })
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

  return (
    <header className="w-full border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left side - Logo or title */}
        <div>
          {/* Add logo or title here if needed */}
        </div>

        {/* Right side - Auth buttons */}
        <div className="flex items-center gap-4">
          {!loading && isAuthenticated && (
            <Button
              variant="ghost"
              onClick={() => router.push('/profile')}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Profile
            </Button>
          )}
          
          {/* 認証状態に基づいてボタンを表示 */}
          <div className="flex items-center gap-2">
            {isSignedIn && account && (
              <>
                <div className="flex flex-col mr-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Address:</span> {formatAddress(account.address)}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Balance:</span> {balance} SUI
                  </div>
                </div>
                <TuskyLogoutButton />
              </>
            )}
            {!isSignedIn && <SuiWalletLoginButton />}
          </div>
        </div>
      </div>
    </header>
  )
}
