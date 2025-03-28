"use client"

import { LogoutButton } from "@/components/auth/LogoutButton"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { SuiWalletLoginButton } from "@/components/auth/SuiWalletLoginButton"

export function Header() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

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
              プロフィール
            </Button>
          )}
          {!loading && (
            isAuthenticated ? (
              <LogoutButton />
            ) : (
              <SuiWalletLoginButton />
            )
          )}
        </div>
      </div>
    </header>
  )
}
