"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setupEncryption, createPrivateVault as tuskyCreateVault, uploadFileToVault as tuskyUploadFile } from "@/lib/tusky/tusky"
import { tuskyApi } from "@/lib/api/client/tusky"
import { useTusky } from "@/hooks/useTusky"
import { logger } from "@/lib/logger"
import { Loader2, Lock, Upload, Key } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"

export default function VaultListPage() {
  const [vaultName, setVaultName] = useState("")
  const [vaultPassword, setVaultPassword] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [encryptionSetup, setEncryptionSetup] = useState(false)
  const { client, isSignedIn } = useTusky()
  const account = useCurrentAccount()

  // 暗号化を初期設定
  const handleSetupEncryption = async () => {
    if (!client || !vaultPassword.trim()) {
      return
    }

    try {
      setLoading(true)
      await setupEncryption(client, vaultPassword)
      setEncryptionSetup(true)
      logger.info('[UI] Encryption setup successful')
    } catch (error) {
      logger.error('[UI] Error setting up encryption', { error })
    } finally {
      setLoading(false)
    }
  }

  // プライベートボールト作成処理
  const handleCreateVault = async () => {
    if (!vaultName.trim() || !client || !account) {
      return
    }

    try {
      setLoading(true)
      
      // ウォレットアドレスの取得
      const walletAddress = account.address
      
      // 本家のtusky.tsのcreatePrivateVault関数を使用
      const vaultResult = await tuskyCreateVault(client, vaultName, encryptionSetup ? undefined : vaultPassword)
      logger.info('[UI] Vault created with Tusky client', { result: vaultResult })
      
      // Supabaseにボールトデータを保存
      await tuskyApi.createVault(
        vaultName,
        vaultResult.id, // Tuskyから返されたボールトIDを使用
        walletAddress,
        true // 暗号化有効
      )
      
      setVaultName("")
      setSelectedVaultId(vaultResult.id) // 作成したボールトを選択
      logger.info('[UI] Vault metadata saved to Supabase', { id: vaultResult.id })
    } catch (error) {
      logger.error('[UI] Error creating vault', { error })
    } finally {
      setLoading(false)
    }
  }

  // ファイルアップロード処理
  const handleFileUpload = async () => {
    if (!file || !selectedVaultId || !client || !account) {
      return
    }

    try {
      setUploadLoading(true)
      const walletAddress = account.address
      
      // 本家のtusky.tsのuploadFileToVault関数を使用
      const uploadId = await tuskyUploadFile(client, selectedVaultId, file)
      logger.info('[UI] File uploaded with Tusky client', { uploadId })
      
      // Supabaseにファイルメタデータを保存
      await tuskyApi.saveFile(
        file.name, // fileIdの代わりにファイル名を使用（適宜調整）
        uploadId, // Tuskyから返されたアップロードID
        file.name,
        selectedVaultId,
        walletAddress,
        file.type,
        file.size
      )
      
      setFile(null)
    } catch (error) {
      logger.error('[UI] Error uploading file', { error })
    } finally {
      setUploadLoading(false)
    }
  }

  // ファイル選択処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>認証が必要</CardTitle>
            <CardDescription>
              プライベートボールトを作成するには、まずTuskyにログインしてください。
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => window.location.href = '/login'}>
              ログインページへ
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="grid gap-6">
        {/* 暗号化設定セクション */}
        {isSignedIn && !encryptionSetup && (
          <Card>
            <CardHeader>
              <CardTitle>暗号化設定</CardTitle>
              <CardDescription>
                プライベートボールトを作成する前に、暗号化のためのパスワードを設定する必要があります。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <Input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="暗号化パスワード"
                  />
                </div>
                <Button onClick={handleSetupEncryption} disabled={loading || !vaultPassword.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      設定中...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      暗号化を設定
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ボールト作成セクション */}
        <Card>
          <CardHeader>
            <CardTitle>プライベートボールトを作成</CardTitle>
            <CardDescription>
              暗号化されたプライベートボールトを作成します。アップロードされたファイルはエンドツーエンドで暗号化されます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <Input
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="ボールト名"
              />
              
              {!encryptionSetup && (
                <Input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  placeholder="暗号化パスワード"
                />
              )}
              
              <Button 
                onClick={handleCreateVault} 
                disabled={loading || !vaultName.trim() || (!encryptionSetup && !vaultPassword.trim())}
                className="self-end"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    ボールトを作成
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ファイルアップロードセクション */}
        {selectedVaultId && (
          <Card>
            <CardHeader>
              <CardTitle>ファイルをアップロード</CardTitle>
              <CardDescription>
                ボールト ID: {selectedVaultId} にファイルをアップロードします。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <Input 
                    type="file" 
                    onChange={handleFileChange}
                    disabled={uploadLoading}
                  />
                </div>
                <Button 
                  onClick={handleFileUpload} 
                  disabled={uploadLoading || !file}
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      アップロード
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
