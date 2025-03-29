"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setupEncryption, createPrivateVault as tuskyCreateVault, uploadFileToVault as tuskyUploadFile } from "@/lib/tusky/tusky"
import { tuskyApi } from "@/lib/api/client/tusky"
import { useTusky } from "@/hooks/useTusky"
import { logger } from "@/lib/logger"
import { Loader2, Lock, Upload, Key, ListOrdered } from "lucide-react"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { createNFTTransaction, getNFTObjectIdFromTransaction } from "@/lib/sui/client"
import { nftApi } from "@/lib/api/client/nft"

export default function VaultListPage() {
  const [vaultName, setVaultName] = useState("")
  const [vaultPassword, setVaultPassword] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [encryptionSetup, setEncryptionSetup] = useState(false)
  const [listingLoading, setListingLoading] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [nftPrice, setNftPrice] = useState<string>("1000000000") // 1 SUI = 1,000,000,000 units
  const [transactionDigest, setTransactionDigest] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { client, isSignedIn } = useTusky()
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

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
      const uploadedId = await tuskyUploadFile(client, selectedVaultId, file)
      logger.info('[UI] File uploaded with Tusky client', { uploadId: uploadedId })
      
      // アップロードIDを保存
      setUploadId(uploadedId)
      
      // blob_idを生成（この例ではuploadIdを使用）
      const blobId = uploadedId  // または適切なblobId生成ロジックを使用
      
      // Supabaseにファイルメタデータを保存
      await tuskyApi.saveFile(
        file.name,     // fileId
        uploadedId,    // uploadId
        blobId,        // blob_id - 明示的に指定
        file.name,     // name
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

  // NFTをリストする処理
  const handleListNFT = async () => {
    if (!uploadId || !account) {
      logger.warn('[UI] Cannot list NFT: Missing upload ID or account', { uploadId, account })
      return
    }

    try {
      setListingLoading(true)
      setErrorMessage(null)
      setTransactionDigest(null)
      logger.info('[UI] Attempting to list NFT', { uploadId })
      
      // NFT情報の準備
      const price = BigInt(nftPrice)
      const blobId = uploadId
      const name = file ? file.name : "Unknown File"
      const description = `File uploaded through vault: ${selectedVaultId}`
      
      // createNFTTransaction関数を使用して、トランザクションを作成
      const tx = createNFTTransaction(
        price,
        blobId,
        name,
        description
      )
      
      // ウォレットを使ってトランザクションに署名して実行
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            logger.info('[UI] NFT listed successfully', { 
              digest: result.digest,
              blobId,
              name
            })
            
            // トランザクションの結果を待ってから最新の状態を取得
            const txResult = await suiClient.waitForTransaction({ digest: result.digest })
            logger.info('[UI] Transaction result', { txResult })
            
            // 生成されたNFTのObjectIDを取得
            const createdObjectId = await getNFTObjectIdFromTransaction(suiClient, result.digest)
            if (!createdObjectId) {
              logger.error('[UI] Failed to get NFT object ID', { digest: result.digest })
              setErrorMessage("NFTの作成は成功しましたが、ObjectIDの取得に失敗しました")
              setListingLoading(false)
              return
            }

            try {
              // NFTデータをデータベースに保存（ObjectIDを使用）
              await nftApi.create(
                createdObjectId, // NFTのObjectIDを使用
                uploadId        // アップロードされたファイルのID
              )
              logger.info('[UI] NFT data saved to database', { 
                nft_id: createdObjectId,
                file_id: uploadId
              })
            } catch (error) {
              logger.error('[UI] Error saving NFT data to database', { error })
              setErrorMessage("NFTの作成は成功しましたが、データベースへの保存に失敗しました")
            }

            // トランザクションダイジェストを保存（UI表示用）
            setTransactionDigest(result.digest)
            setListingLoading(false)
          },
          onError: (error) => {
            logger.error('[UI] Error listing NFT', { error })
            setErrorMessage(error instanceof Error ? error.message : "トランザクションの実行に失敗しました")
            setListingLoading(false)
          }
        }
      )
    } catch (error) {
      logger.error('[UI] Error preparing transaction', { error })
      setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました")
      setListingLoading(false)
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

        {/* NFTリストセクション */}
        {uploadId && (
          <Card>
            <CardHeader>
              <CardTitle>NFTをリスト</CardTitle>
              <CardDescription>
                アップロードしたファイルをNFTとしてブロックチェーンに登録します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">NFT価格 (SUI単位)</label>
                  <Input
                    type="number"
                    value={nftPrice}
                    onChange={(e) => setNftPrice(e.target.value)}
                    placeholder="NFT価格（SUI）"
                  />
                  <p className="text-xs text-gray-500 mt-1">1 SUI = 1,000,000,000 units</p>
                </div>
                
                {transactionDigest && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-700 font-medium">NFTのリストに成功しました！</p>
                    <p className="text-sm mt-1">トランザクションハッシュ:</p>
                    <p className="text-xs font-mono bg-white p-2 rounded border mt-1 break-all">
                      {transactionDigest}
                    </p>
                    <p className="text-xs mt-2">
                      <a 
                        href={`https://explorer.sui.io/txblock/${transactionDigest}?network=testnet`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Suiエクスプローラーで確認する →
                      </a>
                    </p>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">エラー: {errorMessage}</p>
                  </div>
                )}
                
                <Button 
                  onClick={handleListNFT} 
                  disabled={listingLoading || !uploadId}
                  className="self-end"
                >
                  {listingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      リスト中...
                    </>
                  ) : (
                    <>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      NFTをリスト
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
