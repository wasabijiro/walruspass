/**
 * Sui contract interaction types
 */

// Gatekeeperコントラクトで扱うNFTの型定義
export type NFT = {
  id: string;
  owner: string;
  price: bigint;
  blobId: string;
  name: string;
  description: string;
};

// NFTリスティングの型定義
export type Listing = {
  id: string;
  nfts: NFT[];
};

// NFT Mintイベントの型定義
export type NFTMintEvent = {
  nftId: string;
  buyer: string;
  seller: string;
  price: bigint;
  name: string;
};

// コントラクト操作結果の型定義
export type ContractResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  digest?: string; // トランザクションダイジェスト
};

// SuiのObjectデータの簡易型定義
export type SuiObjectData = {
  objectId: string;
  version: string;
  digest: string;
  type?: string;
  content?: unknown;
  owner?: {
    AddressOwner?: string;
    ObjectOwner?: string;
    Shared?: { initial_shared_version: number };
  };
};

// NFT情報取得結果の型定義
export type NFTInfoResult = {
  nftIndex: number;
  objectData: SuiObjectData;
};

// Suiオブジェクト作成結果の型定義
export type ObjectCreationResult = {
  objectId: string;
  digest: string;
}; 