"use client"

import { useEffect, useState } from "react"
import { tuskyApi } from "@/lib/api/client/tusky"
import { TuskyFile } from "@/lib/api/domain"
import { logger } from "@/lib/logger"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useTusky } from "@/hooks/useTusky"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { getFile, listFiles } from "@/lib/tusky/tusky"
import { downloadFile } from "@/lib/tusky/tusky"
import { Input } from "@/components/ui/input"
import { createBuyNFTTransaction } from "@/lib/sui/client"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"

// ファイル詳細情報の型定義
interface FileDetails {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  vaultId?: string;
  uploadId?: string;
  createdAt?: string;
  status?: string;
  [key: string]: unknown; // その他の可能性のあるプロパティ
}

// ファイルIDを定数として定義
const TARGET_FILE_ID = '591a5637-f5d4-4c75-937e-a0eac50fb73a'

export default function Home() {
  const [files, setFiles] = useState<TuskyFile[]>([])

  const [loading, setLoading] = useState(true)
  const account = useCurrentAccount()
  const { isSignedIn, client } = useTusky()

  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<{
    fileId: string;
    name: string;
    uploadId?: string;
    details?: FileDetails;
  } | null>(null)
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [downloadPassword, setDownloadPassword] = useState("")
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const suiClient = useSuiClient()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()

  useEffect(() => {
    async function fetchFiles() {
      try {
        setLoading(true)
        
        // クライアントとアカウントの確認
        if (!client || !account) {
          logger.warn("クライアントまたはアカウントがありません")
          return
        }
        
        logger.info("Tuskyクライアントを使ってファイル一覧を取得")
        
        // Tuskyクライアントを使用してlistFilesを実行
        const tuskyResult = await listFiles(client, {
          limit: 5 // 最新の5件のみ表示
        })
        
        logger.info("Tuskyからファイル一覧を取得成功", { count: tuskyResult.items?.length || 0 })
        
        // APIを使用してファイル一覧を取得（比較用）
        const params = {
          limit: 5
        }
        
        if (account) {
          params.wallet_address = account.address
        }
        
        const apiResult = await tuskyApi.getFiles(params)
        logger.info("APIからファイル一覧を取得成功", { count: apiResult.items?.length || 0 })
        
        // 両方のデータを比較するためにログ出力
        if (tuskyResult.items?.[0]) {
          logger.info("Tuskyから取得した最初のファイル:", { file: tuskyResult.items[0] })
          
          // 特定のファイルの uploadId を使ってさらに詳細情報を取得
          try {
            const firstFile = tuskyResult.items[0]
            const uploadId = firstFile.uploadId
            
            if (uploadId) {
              logger.info("uploadIdを使って詳細情報を取得", { uploadId })
              
              // uploadIdを使ってlistFilesでフィルタリング
              const filteredResult = await listFiles(client, { uploadId, limit: 1 })
              logger.info("uploadIdでフィルタしたlistFilesの結果", { filteredResult })
              
              // もしファイルIDがある場合はgetFileも試す
              if (firstFile.id) {
                try {
                  const fileDetail = await getFile(client, firstFile.id)
                  logger.info("getFileで取得した詳細情報", { fileDetail })
                } catch (getError) {
                  logger.error("getFileでエラー発生", { error: getError })
                }
              }
            }
          } catch (detailError) {
            logger.error("詳細情報取得中にエラー", { error: detailError })
          }
        }
        
        // APIから取得したファイル一覧を表示用に設定
        setFiles(apiResult.items)
      } catch (error) {
        logger.error("ファイル一覧取得中にエラー発生", { error })
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [account, client])

  async function handleDownloadWithPassword(file: TuskyFile) {
    if (!client) {
      logger.error("Cannot download file - client not available")
      return
    }

    try {
      setDownloadLoading(file.id)
      
      // パスワードで暗号化を設定
      await client.addEncrypter({ password: downloadPassword })
      
      // ファイルをダウンロード
      const fileData = await downloadFile(client, TARGET_FILE_ID)
      
      if (fileData instanceof Blob) {
        const url = window.URL.createObjectURL(fileData)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name || 'downloaded-file'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      // 成功したらモーダルを閉じてパスワードをリセット
      setShowPasswordModal(false)
      setDownloadPassword("")
      logger.info("File downloaded successfully", { fileId: TARGET_FILE_ID })
    } catch (error) {
      logger.error("Failed to download file", { error, fileId: TARGET_FILE_ID })
    } finally {
      setDownloadLoading(null)
    }
  }

  async function handleViewFile(file: TuskyFile) {
    setShowPasswordModal(true)
    setSelectedFile(file)
  }

  // モーダルを閉じる
  const closeModal = () => {
    setModalOpen(false)
    setSelectedFile(null)
  }

  // NFT購入処理を追加
  const handleBuyNFT = async (file: TuskyFile) => {
    if (!account || !client) {
      logger.error("Cannot buy NFT - client or account not available")
      return
    }

    try {
      setBuyLoading(true)
      
      // より多くのコインを取得
      const { data: coins } = await suiClient.getCoins({
        owner: account.address,
        coinType: "0x2::sui::SUI",
        limit: 10  // limitを増やす
      })

      if (!coins || coins.length === 0) {
        logger.error("No SUI coins available")
        return
      }

      // 利用可能なコインの合計残高を計算
      const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n)
      logger.info("Available balance", { totalBalance: totalBalance.toString() })

      // NFTの価格を取得
      const nftPrice = BigInt(file.nft?.price || 0)
      const gasPrice = 100000000n // 0.1 SUI

      // 必要な合計金額
      const requiredTotal = nftPrice + gasPrice

      if (totalBalance < requiredTotal) {
        logger.error("Insufficient total balance", { 
          required: requiredTotal.toString(),
          available: totalBalance.toString() 
        })
        return
      }

      // 最も残高の多いコインを選択
      const sortedCoins = [...coins].sort((a, b) => 
        Number(BigInt(b.balance) - BigInt(a.balance))
      )

      // 支払い用のコインを選択（最も残高の多いもの）
      const paymentCoin = sortedCoins[0]
      // ガス用のコインを選択（2番目に残高の多いもの、または同じコインを使用）
      const gasCoin = sortedCoins[1] || sortedCoins[0]

      // トランザクションを作成
      const tx = createBuyNFTTransaction(
        file.nft?.id || "",
        paymentCoin.coinObjectId,
        gasCoin.coinObjectId
      )

      // トランザクションを実行
      signAndExecuteTransaction(
        {
          transaction: tx,
        },
        {
          onSuccess: (result) => {
            logger.info("NFT purchased successfully", { 
              digest: result.digest,
              fileId: file.nft?.id
            })
            
            // トランザクションの完了を待つ
            suiClient.waitForTransaction({ digest: result.digest }).then(() => {
              setBuyLoading(false)
            })
          },
          onError: (error) => {
            logger.error("Failed to purchase NFT", { error })
            setBuyLoading(false)
          }
        }
      )
    } catch (error) {
      logger.error("Error in buy NFT process", { error })
      setBuyLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">NFT GateKeeper</h1>
        <p className="text-xl max-w-2xl">
          安全にNFTを保管・管理できるプラットフォーム。暗号化されたボールトでデジタル資産を守ります。
        </p>
        
        {isSignedIn ? (
          <div className="mt-8 flex gap-4">
            <Button onClick={() => router.push('/list')} className="px-6">
              マイNFTを管理する
            </Button>
          </div>
        ) : (
          <div className="mt-8">
            <p className="mb-4">始めるにはSUIウォレットで接続してください</p>
            <Button onClick={() => router.push('/list')} className="px-6">
              接続してNFTを管理する
            </Button>
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center">最新のアップロード</h2>
        
        {loading ? (
          <div className="text-center py-10">読み込み中...</div>
        ) : files.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {files.map((file) => (
              <Card key={file.id}>
                <CardHeader>
                  <CardTitle>{file.fileId}</CardTitle>
                  <CardDescription>Vault: {file.vaultName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    所有者: {file.creatorAddress.substring(0, 10)}...
                  </p>
                  <p className="text-sm">
                    ステータス: {file.encrypted ? "暗号化済み" : "標準"}
                  </p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    onClick={() => handleViewFile(file)}
                    disabled={!client || !isSignedIn || downloadLoading === file.id}
                    className="flex-1"
                    variant="outline"
                  >
                    {downloadLoading === file.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                        読み込み中...
                      </>
                    ) : (
                      "ファイル情報を表示"
                    )}
                  </Button>
                  <Button
                    onClick={() => handleBuyNFT(file)}
                    disabled={!client || !isSignedIn || buyLoading}
                    className="flex-1"
                    variant="default"
                  >
                    {buyLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        購入処理中...
                      </>
                    ) : (
                      "NFTを購入"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            まだアップロードされたNFTはありません。
            {isSignedIn && (
              <div className="mt-4">
                <Button variant="outline" onClick={() => router.push('/list')}>
                  NFTをアップロードする
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* カスタムモーダル - ファイル情報表示用 */}
      {modalOpen && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{selectedFile.name}</h3>
              <button 
                onClick={closeModal}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center">
              {/* ファイル詳細表示 */}
              <div className="bg-gray-100 w-full p-8 rounded-lg">
                <p className="text-lg font-bold mb-2 text-center">ファイル詳細</p>
                
                {selectedFile.details ? (
                  <div>
                    {selectedFile.details.error ? (
                      // エラーがある場合のメッセージ表示
                      <div className="text-center py-6 bg-red-50 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-lg font-semibold text-red-600 mb-2">ファイル詳細情報の取得に失敗しました</p>
                        <p className="text-sm text-gray-600 mb-4">
                          ファイルIDまたはアップロードIDを使った取得が失敗しました。<br />
                          ファイルが存在しないか、アクセス権がない可能性があります。
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          ファイルID: {selectedFile.fileId || 'なし'}<br />
                          アップロードID: {selectedFile.uploadId || 'なし'}
                        </div>
                      </div>
                    ) : (
                      // 正常に詳細情報が取得できた場合の表示
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <p className="text-sm font-semibold">ファイル名:</p>
                            <p className="mb-2">{selectedFile.details.name || selectedFile.fileId}</p>
                            
                            <p className="text-sm font-semibold">ファイルID:</p>
                            <p className="mb-2">{selectedFile.fileId}</p>
                            
                            <p className="text-sm font-semibold">MIME Type:</p>
                            <p className="mb-2">{selectedFile.details.mimeType || '不明'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold">サイズ:</p>
                            <p className="mb-2">{selectedFile.details.size ? `${Math.round(selectedFile.details.size / 1024)} KB` : '不明'}</p>
                            
                            <p className="text-sm font-semibold">ボールトID:</p>
                            <p className="mb-2">{selectedFile.details.vaultId || '不明'}</p>
                            
                            <p className="text-sm font-semibold">アップロードID: <span className="text-xs text-gray-500">(APIで使用)</span></p>
                            <p className="mb-2">{selectedFile.details.uploadId || selectedFile.uploadId || '不明'}</p>
                          </div>
                        </div>
                        
                        {/* もし画像タイプの場合は表示を試みる */}
                        {selectedFile.details.mimeType && selectedFile.details.mimeType.startsWith('image/') && (
                          <div className="text-center mt-4">
                            <p className="text-sm font-semibold mb-2">プレビュー:</p>
                            <p className="text-xs text-gray-500 mb-4">（ダウンロード機能開発中のため、プレビューのみ表示）</p>
                          </div>
                        )}
                        
                        {/* 詳細情報全体を表示 */}
                        <details className="mt-6">
                          <summary className="cursor-pointer text-sm font-semibold">すべての詳細情報を表示</summary>
                          <pre className="bg-gray-200 p-4 rounded mt-2 overflow-auto text-xs">
                            {JSON.stringify(selectedFile.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2">ファイル詳細を取得中...</p>
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <Button onClick={closeModal}>
                    閉じる
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* パスワード入力モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-bold mb-4">パスワードを入力するのだ</h3>
            <Input
              type="password"
              value={downloadPassword}
              onChange={(e) => setDownloadPassword(e.target.value)}
              placeholder="暗号化パスワード"
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordModal(false)
                  setDownloadPassword("")
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={() => selectedFile && handleDownloadWithPassword(selectedFile)}
                disabled={!downloadPassword.trim() || downloadLoading === selectedFile?.id}
              >
                {downloadLoading === selectedFile?.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ダウンロード中...
                  </>
                ) : (
                  "ダウンロード"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
