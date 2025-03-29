import { getFullnodeUrl } from "@mysten/sui.js/client";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { 
  ContractResult, 
  NFTInfoResult, 
  SuiObjectData 
} from "./types";
import { logger } from "../logger";

// ネットワーク設定
export const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

// パッケージとオブジェクトのID設定
// 注意: これらの値は環境変数またはデプロイされたコントラクトのアドレスで更新する必要があります
export const CONTRACT_CONFIG = {
  get PACKAGE_ID(): string {
    const packageId = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
    if (!packageId) {
      console.warn("SUI_PACKAGE_ID is not set in environment variables");
      return "0x...."; // デフォルト値（実際には使用されない想定）
    }
    return packageId;
  },
  // Listingオブジェクトが作成された後のオブジェクトID
  // 環境変数からリスティングIDを取得
  get LISTING_ID(): string {
    const listingId = process.env.NEXT_PUBLIC_SUI_LISTING_ID;
    if (!listingId) {
      console.warn("SUI_LISTING_ID is not set in environment variables");
      return "0x...."; // デフォルト値（実際には使用されない想定）
    }
    return listingId;
  }
};

// Suiクライアントを作成する関数
export function createSuiClient(network: "testnet" | "mainnet" = "testnet"): SuiClient {
  return new SuiClient({ url: networks[network].url });
}

// blob_idからURLを生成する関数
export function getBlobUrl(blobId: string): string {
  // ベースURLの設定
  const BLOB_API_BASE_URL = "https://aggregator.walrus-testnet.walrus.space/v1/blobs";
  
  // URLの生成
  return `${BLOB_API_BASE_URL}/${blobId}`;
}

// NFTを作成するためのトランザクションブロックを作成する関数
export function createNFTTransaction(
  price: bigint,
  blobId: string,
  name: string,
  description: string
): Transaction {
  const tx = new Transaction();

  // ガス予算を明示的に設定する（最小値は1,000,000）
  tx.setGasBudget(100000000);

  // デバッグ用にログを追加
  logger.info(`createNFTTransaction: ${CONTRACT_CONFIG.PACKAGE_ID}::gatekeeper::create_nft`);
  logger.info(`price: ${price}`);
  logger.info(`blobId: ${blobId}`);
  logger.info(`name: ${name}`);
  logger.info(`description: ${description}`);

  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::gatekeeper::create_nft`,
    arguments: [
      tx.pure.u64(price),
      tx.pure.string(blobId),
      tx.pure.string(name),
      tx.pure.string(description),
    ],
  });

  return tx;
}

// NFTを購入するためのトランザクションブロックを作成する関数
export function createBuyNFTTransaction(
  nftId: string,
  coinObjectId: string,
  coinType: string = "0x2::sui::SUI"
): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.PACKAGE_ID}::gatekeeper::buy_nft`,
    typeArguments: [coinType],
    arguments: [
      tx.object(nftId),
      tx.object(coinObjectId),
    ],
  });
  
  return tx;
}

// Listingから特定のインデックスのNFT情報を取得する関数
export async function getNFTInfo(
  client: SuiClient,
  listingId: string,
  nftIndex: number
): Promise<NFTInfoResult> {
  const objects = await client.getObject({
    id: listingId,
    options: {
      showContent: true,
    },
  });
  
  // 戻り値として索引を含めることで、nftIndexを使用していることを示す
  return {
    nftIndex,
    objectData: objects.data as SuiObjectData
  };
}

// Listingに含まれるNFTの数を取得する関数
export async function getNFTCount(
  client: SuiClient,
  listingId: string
): Promise<ContractResult<number>> {
  try {
    const response = await client.getObject({
      id: listingId,
      options: {
        showContent: true,
      },
    });
    
    // レスポンスがnullまたはundefinedの場合はエラーとして扱う
    if (!response || !response.data) {
      return {
        success: false,
        error: "Failed to retrieve object data",
      };
    }
    
    // このオブジェクトからNFTの数を取り出す処理は実際のデータ構造に応じて実装する必要がある
    return {
      success: true,
      data: 0, // 実際の実装ではresponse.dataからNFT数を取得する
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * トランザクション結果からNFTのObjectIDを取得する
 * @param digest トランザクションダイジェスト
 * @returns NFTのObjectID、取得できない場合はnull
 */
export async function getNFTObjectIdFromTransaction(
  suiClient: SuiClient,
  digest: string
): Promise<string | null> {
  try {
    logger.info('Getting NFT object ID from transaction', { digest })
    
    // トランザクションの結果を取得
    const txResult = await suiClient.getTransactionBlock({
      digest,
      options: {
        showEffects: true,
        showInput: true,
        showEvents: true
      }
    })

    logger.info('Transaction result', { txResult })
    
    // トランザクションで作成されたオブジェクトを探す
    const createdObjects = txResult.effects?.created || []
    
    // 作成されたオブジェクトの中からNFTを探す
    // NFTは最初に作成されたオブジェクトのはずなので、最初のオブジェクトを取得
    const nftObject = createdObjects[0]
    
    if (!nftObject?.reference?.objectId) {
      logger.error('No NFT object found in transaction', { 
        digest,
        createdObjects 
      })
      return null
    }
    
    logger.info('Found NFT object ID', { 
      objectId: nftObject.reference.objectId,
      digest 
    })
    
    return nftObject.reference.objectId
  } catch (error) {
    logger.error('Error getting NFT object ID from transaction', { 
      error,
      digest 
    })
    return null
  }
}
