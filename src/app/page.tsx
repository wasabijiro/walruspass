"use client"

import { useEffect, useState } from "react"
import { tuskyApi } from "@/lib/api/client/tusky"
import { TuskyFile } from "@/lib/api/domain"
import { logger } from "@/lib/logger"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useTusky } from "@/hooks/useTusky"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
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

// アドレスを省略して表示するユーティリティ関数を追加
const formatShortAddress = (address: string): string => {
  if (!address || address.length < 10) return address || '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

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

  // ユーザーが所有しているNFTのIDを保持する状態を追加
  const [ownedNftIds, setOwnedNftIds] = useState<string[]>([])
  // 購入中・購入済みのNFTのIDを追跡する状態を追加
  const [justPurchasedNftIds, setJustPurchasedNftIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchFiles() {
      try {
        setLoading(true)
        
        logger.info("Fetching NFT data from Supabase directly")
        
        // ウォレット接続なしでも直接APIからデータを取得
        const params = {
          limit: 6 // より良いグリッドレイアウトのために6件表示
        }
        
        // アカウントが接続されている場合は、そのアドレスも送信（ただし必須ではない）
        if (account) {
          params.wallet_address = account.address
        }
        
        const apiResult = await tuskyApi.getFiles(params)
        logger.info("Successfully retrieved NFT data from API", { count: apiResult.items?.length || 0 })
        
        // 取得したデータを表示用に設定
        setFiles(apiResult.items)

        // アカウントが接続されている場合は所有しているNFTのIDリストを取得
        if (account && isSignedIn) {
          try {
            // creatorAddressではなく、実際の所有者チェックを行う
            // 注: APIやデータ構造に合わせて適切に修正する必要がある
            const ownedNfts = apiResult.items
              .filter(file => 
                // 所有者情報がnftオブジェクトに含まれている場合はそれをチェック
                (file.nft?.owner === account.address) || 
                // クリエイターであることも所有の一つの条件かもしれない
                (file.creatorAddress === account.address)
              )
              .map(file => file.id)
            
            setOwnedNftIds(ownedNfts)
            logger.info("User owned NFTs", { count: ownedNfts.length })
          } catch (ownedError) {
            logger.error("Error retrieving owned NFTs", { error: ownedError })
          }
        }
      } catch (error) {
        logger.error("Error retrieving NFT data", { error })
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [account, isSignedIn])

  // ファイルをダウンロードする処理
  const handleDownload = async (fileId: string) => {
    if (!client) {
      logger.error("Cannot download file - client not available")
      return
    }

    try {
      setDownloadLoading(fileId)
      
      // 環境変数からパスワードを取得して暗号化設定を行う
      const encryptionPassword = process.env.NEXT_PUBLIC_ENCRYPTION_PASSWORD
      if (encryptionPassword) {
        await client.addEncrypter({ password: encryptionPassword })
      }
      
      // ファイルをダウンロード
      const fileData = await downloadFile(client, fileId)
      
      if (fileData instanceof Blob) {
        const url = window.URL.createObjectURL(fileData)
        const a = document.createElement('a')
        a.href = url
        const targetFile = files.find(f => f.id === fileId)
        a.download = targetFile?.name || `walruspass-${fileId.substring(0, 8)}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        logger.info("File downloaded successfully", { fileId })
      }
    } catch (error) {
      logger.error("Failed to download file", { error, fileId })
      // パスワードが間違っている場合や環境変数が設定されていない場合は
      // 従来通りパスワードモーダルを表示する
      const targetFile = files.find(f => f.id === fileId)
      if (targetFile) {
        setSelectedFile(targetFile)
        setShowPasswordModal(true)
      }
    } finally {
      setDownloadLoading(null)
    }
  }

  // NFTの所有状態をチェック（購入済みかどうか）
  const isNftOwned = (file: TuskyFile): boolean => {
    // 購入済みのNFTのみをDownloadボタンにする（デモ用）
    return justPurchasedNftIds.includes(file.id);
    
    // 本番環境ではこちらを使用
    // return justPurchasedNftIds.includes(file.id) || ownedNftIds.includes(file.id);
  }

  async function handleDownloadWithPassword(file: TuskyFile) {
    if (!client) {
      logger.error("Cannot download file - client not available")
      return
    }

    try {
      setDownloadLoading(file.id)
      
      // パスワードで暗号化を設定
      await client.addEncrypter({ password: downloadPassword })
      
      // 固定IDの代わりに、選択したファイルのIDを使用する
      const fileData = await downloadFile(client, file.id)
      
      if (fileData instanceof Blob) {
        const url = window.URL.createObjectURL(fileData)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name || `walruspass-${file.id.substring(0, 8)}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }

      // 成功したらモーダルを閉じてパスワードをリセット
      setShowPasswordModal(false)
      setDownloadPassword("")
      logger.info("File downloaded successfully", { fileId: file.id })
    } catch (error) {
      logger.error("Failed to download file", { error, fileId: file.id })
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

  const _handleBuyNFT = async (file: TuskyFile) => {
    logger.info("Buying NFT", { file })
    
    // 購入したNFTをリストに追加して、Downloadボタンに切り替える
    setJustPurchasedNftIds(prev => {
      // 重複を避けて追加
      if (!prev.includes(file.id)) {
        return [...prev, file.id];
      }
      return prev;
    });
    
    // UIを更新するために小さな遅延を入れる
    setTimeout(() => {
      // 空の状態更新でコンポーネントを再レンダリング
      setFiles(files => [...files]);
    }, 100);
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
            
            // 購入したNFTをリストに追加
            setJustPurchasedNftIds(prev => [...prev, file.id])
            
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
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center mb-16">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          WalrusPass Marketplace
        </h1>
        <p className="text-xl max-w-2xl mb-8">
          Discover exclusive digital assets secured by blockchain technology. Buy, sell, and collect unique NFTs with verified authenticity.
        </p>
        
        {isSignedIn ? (
          <div className="flex gap-4">
            <Button onClick={() => router.push('/list')} size="lg" className="px-8">
              Create & Manage NFTs
            </Button>
            <Button onClick={() => router.push('/collection')} variant="outline" size="lg">
              View My Collection
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-accent/50 rounded-lg max-w-xl">
            <p className="text-muted-foreground mb-2">
              To create, buy, or manage NFTs, you'll need to connect your SUI wallet first.
            </p>
            <p className="text-sm text-primary">
              Click the wallet icon in the navigation bar to get started.
            </p>
          </div>
        )}
      </div>

      {/* Featured NFTs Section */}
      <div className="mb-20">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Featured Collections</h2>
          <Button variant="outline" onClick={() => router.push('/marketplace')}>
            View All
          </Button>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <CardContent className="p-6">
                  <div className="h-6 bg-muted animate-pulse rounded mb-2 w-3/4" />
                  <div className="h-4 bg-muted animate-pulse rounded mb-4 w-1/2" />
                  <div className="h-10 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : files.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {file.fileType?.startsWith('image/') ? (
                    <div className="w-full h-full bg-gradient-to-br from-primary/5 to-purple-500/5 flex items-center justify-center">
                      <div className="relative w-full h-full">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <svg className="h-20 w-20 text-primary/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : file.fileType?.startsWith('video/') ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 flex items-center justify-center">
                      <svg className="h-20 w-20 text-blue-500/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : file.fileType?.startsWith('audio/') ? (
                    <div className="w-full h-full bg-gradient-to-br from-green-500/5 to-blue-500/5 flex items-center justify-center">
                      <svg className="h-20 w-20 text-green-500/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-500/5 to-red-500/5 flex items-center justify-center">
                      <svg className="h-20 w-20 text-orange-500/30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  
                  {/* NFT badge - changed from NFT to WalrusPass */}
                  <div className="absolute top-3 left-3 bg-primary/90 text-white text-xs font-bold px-2 py-1 rounded-full">
                    WalrusPass
                  </div>
                  
                  {/* Creator badge に省略アドレスを表示 */}
                  <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-400 mr-1"></div>
                    <span>Verified Creator</span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{file.nft?.name || file.name || "Untitled NFT"}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {file.nft?.description || "Exclusive digital asset secured on the Sui blockchain with verified authenticity."}
                      </p>
                      {/* クリエイター情報を追加 */}
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
                        <p className="text-xs text-muted-foreground">
                          Creator: {formatShortAddress(file.creatorAddress)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Price</p>
                      <p className="text-lg font-bold">{file.nft?.price ? parseFloat(file.nft.price): 0.1} SUI</p>
                    </div>
                    
                    {isSignedIn ? (
                      isNftOwned(file) ? (
                        // 所有者またはJust Purchasedの場合はDownloadボタンを表示
                        <Button 
                          onClick={() => handleDownload(file.id)}
                          disabled={downloadLoading === file.id}
                          className="w-1/2"
                          variant={justPurchasedNftIds.includes(file.id) ? "default" : "outline"}
                        >
                          {downloadLoading === file.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              Download
                            </>
                          )}
                        </Button>
                      ) : (
                        // 所有者でない場合はBuyボタンを表示
                        <Button 
                          // onClick={() => handleBuyNFT(file)}  // 本番環境では実際の購入処理 (コメントアウト)
                          onClick={() => _handleBuyNFT(file)}  // デモ用の簡易処理
                          disabled={buyLoading}
                          className="w-1/2"
                        >
                          {buyLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Buy Now"
                          )}
                        </Button>
                      )
                    ) : (
                      <div className="text-xs text-right text-amber-600 font-medium">
                        Wallet connection required to purchase
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-accent/20 rounded-lg">
            <svg className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M20.91 11.12a10 10 0 1 0-8.03 8.03"></path>
              <circle cx="12" cy="12" r="1"></circle>
              <path d="M17 17v.01"></path>
              <path d="M13 17v.01"></path>
              <path d="M13 13v.01"></path>
              <path d="M17 13v.01"></path>
              <path d="M17 21v-4h4"></path>
            </svg>
            <h3 className="text-xl font-bold mb-2">No WalrusPass NFTs Available Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Be the first to mint and list an exclusive WalrusPass NFT on our marketplace.
            </p>
            {isSignedIn ? (
              <Button variant="outline" onClick={() => router.push('/list')}>
                Create Your First NFT
              </Button>
            ) : (
              <p className="text-sm text-amber-600">Connect your wallet to create NFTs</p>
            )}
          </div>
        )}
      </div>
      
      {/* How It Works Section */}
      <div className="mb-20">
        <h2 className="text-3xl font-bold mb-10 text-center">How WalrusPass Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">1. Create</h3>
              <p className="text-muted-foreground">
                Upload your digital content and secure it with end-to-end encryption in a private vault.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">2. Secure</h3>
              <p className="text-muted-foreground">
                Mint your content as an NFT on the Sui blockchain, establishing provable ownership and authenticity.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">3. Share</h3>
              <p className="text-muted-foreground">
                List your NFT on the marketplace for others to purchase, or keep it in your personal collection.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Categories Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Explore WalrusPass Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Digital Art", icon: "🎨", bg: "from-pink-500/20 to-purple-500/20" },
            { name: "Music", icon: "🎵", bg: "from-blue-500/20 to-cyan-500/20" },
            { name: "Videos", icon: "🎬", bg: "from-orange-500/20 to-amber-500/20" },
            { name: "Documents", icon: "📄", bg: "from-green-500/20 to-emerald-500/20" },
          ].map((category) => (
            <div 
              key={category.name}
              className={`rounded-lg p-6 bg-gradient-to-br ${category.bg} flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all duration-300`}
            >
              <span className="text-4xl mb-2">{category.icon}</span>
              <h3 className="font-medium">{category.name}</h3>
            </div>
          ))}
        </div>
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

      {/* Password Input Modal - Enhanced and Translated to English */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[420px] max-w-full">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <svg className="h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-1">Encryption Password Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This content is protected with end-to-end encryption. Please enter the password to download.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="password"
                  value={downloadPassword}
                  onChange={(e) => setDownloadPassword(e.target.value)}
                  placeholder="Enter decryption password"
                  className="pr-10 py-6 text-center"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-muted-foreground/70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    <path d="M2 12c0 1.68.5 2.59 1.34 3.2C4.74 16.31 7.8 18 12 18c4.19 0 7.26-1.69 8.66-2.8.84-.61 1.34-1.52 1.34-3.2 0-1.68-.5-2.59-1.34-3.2C19.26 7.69 16.2 6 12 6c-4.19 0-7.26 1.69-8.66 2.8C2.5 9.41 2 10.32 2 12Z" />
                  </svg>
                </div>
              </div>
              
              {selectedFile && selectedFile.name && (
                <div className="bg-muted/60 p-3 rounded-md flex items-center">
                  <div className="bg-background p-2 rounded mr-3">
                    {selectedFile.fileType?.startsWith('image/') ? (
                      <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    ) : selectedFile.fileType?.startsWith('video/') ? (
                      <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-orange-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">WalrusPass Encrypted Content</p>
                  </div>
                </div>
              )}
                
              <div className="flex justify-between gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setDownloadPassword("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => selectedFile && handleDownloadWithPassword(selectedFile)}
                  disabled={!downloadPassword.trim() || downloadLoading === selectedFile?.id}
                >
                  {downloadLoading === selectedFile?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Security Note */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center">
                <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                All content is decrypted locally in your browser for maximum security
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
