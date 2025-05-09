import { NFT, Profile, TuskyFile, TuskyVault } from "./domain"

// `GET /api/profile`
export interface GetProfileByIdRequest {
  userId: string
}
export type GetProfileByIdResponse = Profile

// `PUT /api/profile/update`
export interface UpdateProfileRequest {
  display_name?: string | null
  avatar_file?: File | null
}
export interface UpdateProfileResponse {
  success: boolean
  profile: Profile
}

// `POST /api/tusky/vaults/create`
export interface CreateVaultRequest {
  name: string
  vault_id: string
  wallet_address: string
  encrypted?: boolean
}
export interface CreateVaultResponse {
  success: boolean
  vault: TuskyVault
}

// `POST /api/tusky/files/upload`
export interface CreateFileRequest {
  file_id: string  // 内部使用のみ
  upload_id: string
  blob_id: string  // Add this line
  name: string     // 内部使用のみ
  vault_id: string
  wallet_address: string
}
export interface CreateFileResponse {
  success: boolean
  file: TuskyFile
}

// `GET /api/tusky/files`
export interface ListFilesRequest {
  vaultId?: string
  wallet_address?: string
  limit?: number
  offset?: number
}

export interface ListFilesResponse {
  items: (TuskyFile & { nft?: NFT })[]  // NFT情報をオプショナルで含める
  count: number
}

// `POST /api/nft/insert`
export interface CreateNFTRequest {
  nft_id: string
  file_id: string
  name: string
  description: string
  price: string
}

export interface CreateNFTResponse {
  success: boolean
  nft: NFT
}
