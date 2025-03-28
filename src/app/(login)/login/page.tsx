import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SuiWalletLoginButton } from "@/components/auth/SuiWalletLoginButton"

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <Card className="w-[90%] max-w-md">
        <CardHeader className="px-8">
          <CardTitle className="text-2xl text-center">
            ログイン
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-8 pb-8">
          <SuiWalletLoginButton />
        </CardContent>
      </Card>
    </div>
  )
}
