"use client"

import { TuskyLogoutButton } from "@/components/auth/LogoutButton"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SuiWalletLoginButton } from "@/components/auth/SuiWalletLoginButton"
import { useTusky } from "@/hooks/useTusky"
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit"
import { formatAddress } from "@mysten/sui.js/utils"
import { useEffect, useState } from "react"
import { logger } from "@/lib/logger"
import { Copy } from "lucide-react"

export function Header() {
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        logger.info('[UI] Address copied to clipboard')
      })
      .catch((error) => {
        logger.error('[UI] Failed to copy address', { error })
      })
  }

  return (
    <header className="w-full border-b bg-background">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Left side - Logo with title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <img src="/logo.png" alt="WalrusPass Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-bold">WalrusPass</h1>
        </div>

        {/* Center - Main action button */}
        <div className="hidden md:flex">
          <Button
            variant="ghost"
            size="default"
            onClick={() => router.push('/list')}
            className="font-medium hover:bg-transparent hover:text-primary/80 transition-colors text-lg"
          >
            List
          </Button>
        </div>
        
        {/* Right side - Auth buttons */}
        <div className="flex items-center gap-4">
          {isSignedIn && account ? (
            <div className="flex items-center gap-3">
              <div className="bg-secondary/30 px-3 py-2 rounded-lg hidden md:block">
                <div className="text-sm font-medium flex items-center">
                  <span className="text-primary/80">Address:</span>
                  <span className="ml-1">{formatAddress(account.address)}</span>
                  <button 
                    onClick={() => copyToClipboard(account.address)}
                    className="ml-1 p-1 rounded-md hover:bg-primary/10 transition-colors"
                    title="Copy address to clipboard"
                  >
                    <Copy className="size-3.5 text-primary/60" />
                  </button>
                </div>
                <div className="text-sm font-medium">
                  <span className="text-primary/80">Balance:</span> {balance} SUI
                </div>
              </div>
              <TuskyLogoutButton />
            </div>
          ) : (
            <SuiWalletLoginButton />
          )}
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden border-t">
        <div className="container mx-auto px-4 py-2 flex justify-center">
          <Button
            variant="ghost"
            size="default"
            onClick={() => router.push('/list')}
            className="w-full font-medium hover:bg-transparent hover:text-primary/80 transition-colors text-lg"
          >
            List
          </Button>
        </div>
      </div>
    </header>
  )
}
