"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { setupEncryption, createPrivateVault as tuskyCreateVault, uploadFileToVault as tuskyUploadFile } from "@/lib/tusky/tusky"
import { tuskyApi } from "@/lib/api/client/tusky"
import { useTusky } from "@/hooks/useTusky"
import { logger } from "@/lib/logger"
import { Loader2, Lock, Upload, Key, ListOrdered, CheckCircle2, Circle } from "lucide-react"
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
  const [nftPrice, setNftPrice] = useState<string>("0.1") // デフォルト値を0.1 SUIに変更
  const [transactionDigest, setTransactionDigest] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { client, isSignedIn } = useTusky()
  const account = useCurrentAccount()
  const suiClient = useSuiClient()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const [activeStep, setActiveStep] = useState<number>(1)
  const [isPrivateVault, setIsPrivateVault] = useState(false)
  const [nftName, setNftName] = useState<string>("")
  const [nftDescription, setNftDescription] = useState<string>("")

  // 暗号化を初期設定
  const handleSetupEncryption = async () => {
    if (!client || !vaultPassword.trim()) {
      return
    }

    try {
      setLoading(true)
      await setupEncryption(client, vaultPassword)
      setEncryptionSetup(true)
      setActiveStep(2) // Move to next step after encryption setup
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
      setActiveStep(3) // Move to file upload step
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
      setActiveStep(4) // Move to NFT listing step
      
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
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // ファイル名からNFT名のデフォルト値を設定
      const fileName = selectedFile.name;
      const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
      setNftName(nameWithoutExtension || fileName);
      
      // ファイルタイプに基づいた説明文を設定
      let defaultDescription = "Exclusive digital content secured on the blockchain.";
      if (selectedFile.type.startsWith('image/')) {
        defaultDescription = "Exclusive digital artwork with verified authenticity.";
      } else if (selectedFile.type.startsWith('video/')) {
        defaultDescription = "Exclusive video content available only to NFT holders.";
      } else if (selectedFile.type.startsWith('audio/')) {
        defaultDescription = "Exclusive audio content with unique ownership rights.";
      }
      
      setNftDescription(defaultDescription);
    }
  }

  // NFTをリストする処理
  const handleListNFT = async () => {
    if (!uploadId || !account) {
      return
    }

    try {
      setListingLoading(true)
      setErrorMessage(null)
      setTransactionDigest(null)
      logger.info('[UI] Attempting to list NFT', { uploadId, name: nftName, description: nftDescription })
      
      // SUIの単位変換 (1 SUI = 1,000,000,000単位)
      const price = BigInt(Math.floor(parseFloat(nftPrice) * 1_000_000_000))
      
      // NFT情報をセット
      const name = nftName || "Untitled NFT"
      const description = nftDescription || "Exclusive digital content"
      
      // トランザクション作成
      const tx = createNFTTransaction(
        price,
        uploadId,
        name,
        description
      )
      
      // トランザクション実行
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            logger.info('[UI] NFT listing transaction submitted', { digest: result.digest })
            
            try {
              // トランザクションの完了を待つ
              await suiClient.waitForTransaction({ digest: result.digest })
              
              // NFTオブジェクトIDの取得を試みる
              const nftId = await getNFTObjectIdFromTransaction(suiClient, result.digest)
              
              if (nftId) {
                logger.info('[UI] NFT created with ID', { nftId, digest: result.digest })
                
                // createメソッドを使用してnftApiを呼び出す
                try {
                  await nftApi.create(nftId, uploadId)
                  logger.info('[UI] NFT metadata saved to database', { nftId, uploadId })
                } catch (saveError) {
                  // メタデータ保存に失敗してもトランザクションは成功しているので続行
                  logger.error('[UI] Failed to save NFT metadata, but NFT was created', { saveError })
                }
              }
              
              // トランザクションハッシュを設定して成功表示
              setTransactionDigest(result.digest)
              setActiveStep(5) // 次のステップに進む
            } catch (error) {
              logger.error('[UI] Error processing NFT after transaction', { error })
              setErrorMessage('Transaction succeeded but failed to complete NFT creation')
            } finally {
              setListingLoading(false)
            }
          },
          onError: (error) => {
            logger.error('[UI] NFT listing transaction failed', { error })
            setErrorMessage('Failed to create NFT: ' + (error instanceof Error ? error.message : String(error)))
            setListingLoading(false)
          }
        }
      )
    } catch (error) {
      logger.error('[UI] Exception in NFT listing process', { error })
      setErrorMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
      setListingLoading(false)
    }
  }

  if (!isSignedIn) {
    return (
      <div className="container mx-auto p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Please connect with Tusky to create and manage private vaults.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Progress Stepper */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold mb-6 text-center">Create and List Your NFT</h1>
        <div className="flex justify-between items-center mb-2">
          {[
            { step: 1, label: "Setup Encryption" },
            { step: 2, label: "Create Vault" },
            { step: 3, label: "Upload File" },
            { step: 4, label: "List NFT" },
            { step: 5, label: "Success" }
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center w-1/5">
              <div className={`rounded-full flex items-center justify-center w-10 h-10 mb-2 ${
                activeStep >= item.step 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {activeStep > item.step ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : activeStep === item.step ? (
                  <div className="w-3 h-3 bg-background rounded-full" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              <span className={`text-sm text-center ${
                activeStep >= item.step ? "font-medium" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        <div className="relative h-1 bg-muted">
          <div 
            className="absolute h-1 bg-primary transition-all duration-300" 
            style={{ width: `${(activeStep - 1) * 25}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6">
        {/* 暗号化設定セクション */}
        {isSignedIn && !encryptionSetup && (
          <Card className={activeStep === 1 ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle>Step 1: Setup Encryption</CardTitle>
              <CardDescription>
                Set up encryption to protect your vault with end-to-end encryption.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <Input
                    type="password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="Encryption Password"
                  />
                </div>
                <Button onClick={handleSetupEncryption} disabled={loading || !vaultPassword.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Setup Encryption
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ボールト作成セクション */}
        {encryptionSetup && activeStep === 2 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Step 2: Create Private Vault</CardTitle>
              <CardDescription>
                Create an encrypted vault to securely store your digital assets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <Input
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="Vault Name"
                />
                
                {/* トグルスイッチを追加 */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Vault Privacy</label>
                    <p className="text-xs text-muted-foreground">
                      {isPrivateVault 
                        ? "Private: Encrypted, secure storage with end-to-end encryption" 
                        : "Public: Anyone can view your vault content"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={!isPrivateVault ? "font-medium" : "text-muted-foreground"}>Public</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivateVault}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                        isPrivateVault ? 'bg-primary' : 'bg-muted'
                      }`}
                      onClick={() => setIsPrivateVault(!isPrivateVault)}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                          isPrivateVault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={isPrivateVault ? "font-medium" : "text-muted-foreground"}>Private</span>
                  </div>
                </div>
                
                {!isPrivateVault && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-amber-700 text-sm flex items-center">
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                      </svg>
                      Please select Private mode to create a secure vault
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleCreateVault} 
                  disabled={loading || !vaultName.trim() || !isPrivateVault}
                  className="self-end"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Create Vault
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ファイルアップロードセクション */}
        {selectedVaultId && activeStep === 3 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Step 3: Upload File</CardTitle>
              <CardDescription>
                Upload a file that will be securely stored and accessible only to NFT holders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-6">
                {/* ドラッグ&ドロップエリア */}
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    file ? 'border-green-400 bg-green-50' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  style={{ minHeight: '180px' }}
                >
                  {!file ? (
                    <>
                      <div className="mb-4 p-4 rounded-full bg-primary/10">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-lg font-medium mb-1">Choose a file or drag and drop</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Supports: JPG, PNG, GIF, MP4, PDF, and other formats
                      </p>
                      <Button variant="outline" size="sm">
                        Select File
                      </Button>
                      <Input 
                        id="file-upload"
                        type="file" 
                        onChange={handleFileChange}
                        disabled={uploadLoading}
                        className="hidden"
                      />
                    </>
                  ) : (
                    <>
                      <div className="mb-3 p-3 rounded-full bg-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </div>
                      <p className="text-lg font-medium text-green-700 mb-1">File selected</p>
                      <div className="bg-white/80 rounded-md px-4 py-2 shadow-sm mb-2 max-w-full">
                        <div className="flex items-center">
                          <div className="p-2 rounded mr-3 bg-primary/5">
                            {file.type.startsWith('image/') ? (
                              <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                              </svg>
                            ) : file.type.startsWith('video/') ? (
                              <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                              </svg>
                            ) : (
                              <svg className="h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        Change File
                      </Button>
                    </>
                  )}
                </div>
                
                {/* NFT所有者専用アクセスの情報 */}
                <div className="bg-blue-50 rounded-md p-4 flex items-start">
                  <div className="p-1 rounded-full bg-blue-100 mr-3">
                    <Lock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">NFT Holder Exclusive Access</p>
                    <p className="text-xs text-blue-600">
                      This file will be accessible only to users who own the NFT you are about to mint, providing exclusive content for your NFT holders.
                    </p>
                  </div>
                </div>
                
                {/* アップロードボタン */}
                <Button 
                  onClick={handleFileUpload} 
                  disabled={uploadLoading || !file}
                  className="self-end"
                  size="lg"
                >
                  {uploadLoading ? (
                    <>
                      <div className="mr-2 relative">
                        <Loader2 className="h-5 w-5 animate-spin absolute" />
                        <div className="h-5 w-5 rounded-full bg-primary/10"></div>
                      </div>
                      <div>
                        <span className="mr-1">Uploading...</span>
                        <span className="text-xs opacity-70">Securing for NFT holders</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Upload for NFT Holders
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* NFTリストセクション */}
        {uploadId && activeStep === 4 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Step 4: List as NFT</CardTitle>
              <CardDescription>
                List your uploaded file as an NFT on the blockchain for others to purchase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {/* NFT名フィールド */}
                <div>
                  <label className="block text-sm font-medium mb-1">NFT Name</label>
                  <Input
                    type="text"
                    value={nftName}
                    onChange={(e) => setNftName(e.target.value)}
                    placeholder="Give your NFT a name"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">This name will be displayed on the blockchain</p>
                </div>
                
                {/* NFT説明フィールド */}
                <div>
                  <label className="block text-sm font-medium mb-1">NFT Description</label>
                  <textarea
                    value={nftDescription}
                    onChange={(e) => setNftDescription(e.target.value)}
                    placeholder="Describe your NFT"
                    maxLength={200}
                    className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {nftDescription.length}/200 characters
                  </p>
                </div>
                
                {/* NFT価格フィールド - 修正版 */}
                <div>
                  <label className="block text-sm font-medium mb-1">NFT Price (SUI)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={nftPrice}
                      onChange={(e) => setNftPrice(e.target.value)}
                      placeholder="0.1"
                      step="0.1"
                      min="0.1"
                      className="pr-12"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                      SUI
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Enter price in SUI (e.g. 1 for 1 SUI)</p>
                </div>
                
                {/* プレビュー表示 */}
                <div className="bg-accent/30 rounded-lg p-4 my-2">
                  <h3 className="font-medium text-sm mb-2">Preview</h3>
                  <div className="flex items-start gap-4">
                    {file && file.type.startsWith('image/') ? (
                      <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="NFT Preview" 
                          className="object-cover w-full h-full"
                          onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                        <svg className="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                      </div>
                    )}
                    <div className="flex-grow min-w-0">
                      <h4 className="font-medium text-sm truncate">{nftName || "Untitled NFT"}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{nftDescription || "No description provided"}</p>
                      <div className="mt-2 text-sm font-medium">{parseFloat(nftPrice) || 0.1} SUI</div>
                    </div>
                  </div>
                </div>
                
                {transactionDigest && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-700 font-medium">NFT Listed Successfully!</p>
                    <p className="text-sm mt-1">Transaction Hash:</p>
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
                        View on Sui Explorer →
                      </a>
                    </p>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700">Error: {errorMessage}</p>
                  </div>
                )}
                
                <Button 
                  onClick={handleListNFT} 
                  disabled={listingLoading || !uploadId || !nftName || !nftDescription || parseFloat(nftPrice) < 0.1}
                  className="self-end"
                >
                  {listingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Listing...
                    </>
                  ) : (
                    <>
                      <ListOrdered className="mr-2 h-4 w-4" />
                      List as NFT
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Success section - shown when NFT is successfully listed */}
        {transactionDigest && activeStep === 5 && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Step 5: NFT Listed Successfully!</CardTitle>
              <CardDescription>
                Your NFT has been successfully created and listed on the blockchain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <h3 className="font-medium text-green-800">Transaction Complete</h3>
                    <p className="text-sm text-green-700">Your NFT was successfully created on the blockchain.</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Transaction Details</h3>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                    <p className="text-xs font-mono break-all bg-background p-2 rounded border">
                      {transactionDigest}
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <a 
                      href={`https://explorer.sui.io/txblock/${transactionDigest}?network=testnet`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View on Sui Explorer →
                    </a>
                  </div>
                </div>
              </div>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                  <p>Your NFT is now available for others to view and purchase!</p>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                      View All NFTs
                    </Button>
                    <Button onClick={() => {
                      setActiveStep(1)
                      setVaultName("")
                      setVaultPassword("")
                      setFile(null)
                      setSelectedVaultId(null)
                      setUploadId(null)
                      setTransactionDigest(null)
                      setErrorMessage(null)
                    }}>
                      Create Another NFT
                    </Button>
                  </div>
                </div>
              </CardContent>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
