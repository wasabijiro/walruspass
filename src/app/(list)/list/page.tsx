"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createPrivateVault, listVaults, uploadFileToVault, setupEncryption } from "@/lib/tusky/tusky"
import { useTusky } from "@/hooks/useTusky"
import { logger } from "@/lib/logger"
import { formatDistance, parseISO } from "date-fns"
import { Loader2, Lock, Upload, RefreshCw, Key } from "lucide-react"

// UIsで使用するVault型の定義
type UIVault = {
  id: string;
  name: string;
  encrypted: boolean;
  created: string;
  fileCount?: number;
};

// 日付を安全にフォーマットする関数
const formatCreatedDate = (dateString: string) => {
  try {
    // 日付文字列を解析して、現在との距離を計算
    const date = parseISO(dateString);
    return formatDistance(date, new Date(), { addSuffix: true });
  } catch (error) {
    // 日付の解析に失敗した場合は、元の文字列を返す
    logger.error('[UI] Failed to format date', { dateString, error });
    return '不明な日時';
  }
};

export default function VaultListPage() {
  const [vaultName, setVaultName] = useState("")
  const [vaultPassword, setVaultPassword] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null)
  const [vaults, setVaults] = useState<UIVault[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [encryptionSetup, setEncryptionSetup] = useState(false)
  const { client, isSignedIn } = useTusky()

  // ボールト一覧を取得
  const fetchVaults = async () => {
    if (!client) return;
    
    try {
      setRefreshing(true)
      const vaultList = await listVaults(client)
      // APIから返されたVaultをUI用のVaultにマッピング
      const uiVaults = vaultList.map(vault => ({
        id: vault.id,
        name: vault.name,
        encrypted: !!vault.encrypted,
        created: vault.createdAt || new Date().toISOString(),
        fileCount: vault.filesCount
      }));
      setVaults(uiVaults)
    } catch (error) {
      logger.error('[UI] Failed to fetch vaults', { error })
    } finally {
      setRefreshing(false)
    }
  }

  // 初回ロード時とログイン状態変更時にボールト一覧を取得
  useEffect(() => {
    if (isSignedIn) {
      fetchVaults()
    }
  }, [isSignedIn])

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
    if (!vaultName.trim() || !client) {
      return
    }

    try {
      setLoading(true)
      await createPrivateVault(client, vaultName, encryptionSetup ? undefined : vaultPassword)
      setVaultName("")
      await fetchVaults() // ボールト作成後、一覧を更新
    } catch (error) {
      logger.error('[UI] Error creating vault', { error })
    } finally {
      setLoading(false)
    }
  }

  // ファイルアップロード処理
  const handleFileUpload = async () => {
    if (!file || !selectedVaultId || !client) {
      return
    }

    try {
      setUploadLoading(true)
      const uploadId = await uploadFileToVault(client, selectedVaultId, file)
      logger.info('[UI] File uploaded successfully', { uploadId })
      setFile(null)
      // ファイルアップロード後に一覧を更新
      await fetchVaults()
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

        {/* ボールト一覧と更新ボタン */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">ボールト一覧</h2>
          <Button variant="outline" size="sm" onClick={fetchVaults} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">更新</span>
          </Button>
        </div>

        {/* ボールト一覧表示 */}
        {vaults.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              ボールトがまだありません。新しいボールトを作成してください。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vaults.map((vault) => (
              <Card key={vault.id} className={selectedVaultId === vault.id ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{vault.name}</CardTitle>
                  <CardDescription>
                    {vault.encrypted ? "暗号化済み" : "非暗号化"} • 
                    作成: {formatCreatedDate(vault.created)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>ID: {vault.id}</p>
                  {vault.fileCount !== undefined && (
                    <p>ファイル数: {vault.fileCount}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    variant={selectedVaultId === vault.id ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setSelectedVaultId(vault.id)}
                  >
                    {selectedVaultId === vault.id ? "選択中" : "選択"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* ファイルアップロードセクション */}
        {selectedVaultId && (
          <Card>
            <CardHeader>
              <CardTitle>ファイルをアップロード</CardTitle>
              <CardDescription>
                選択したボールトにファイルをアップロードします。
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
