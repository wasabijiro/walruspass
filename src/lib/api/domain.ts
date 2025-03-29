import { NFTModel, ProfileModel, TuskyFileModel, TuskyVaultModel } from "./models"

export type ProfileId = string

export interface Profile {
  id: ProfileId
  displayName: string | null
  avatarUrl: string | null
}

export function profileModelToDomain(model: ProfileModel): Profile {
  return {
    id: model.id,
    displayName: model.display_name,
    avatarUrl: model.avatar_url
  }
}

export type TuskyVaultId = string

export interface TuskyVault {
  id: TuskyVaultId
  name: string
  creatorAddress: string
  encrypted: boolean
}

export function tuskyVaultModelToDomain(model: TuskyVaultModel): TuskyVault {
  return {
    id: model.id,
    name: model.name,
    creatorAddress: model.wallet_address,
    encrypted: model.encrypted
  }
}

export type TuskyFileId = string

export interface TuskyFile {
  id: TuskyFileId
  vaultId: TuskyVaultId
  vaultName: string
  creatorAddress: string
  encrypted: boolean
  fileId: string
}

export function tuskyFileModelToDomain(model: TuskyFileModel, vault: TuskyVault): TuskyFile {
  return {
    id: model.id,
    vaultId: model.vault_id,
    vaultName: vault.name,
    creatorAddress: vault.creatorAddress,
    encrypted: vault.encrypted,
    fileId: model.id,
  }
}

export type NFTId = string

export interface NFT {
  id: NFTId
  fileId: TuskyFileId
  name: string
  description: string
  price: string
  createdAt: string
  updatedAt: string
}

export function nftModelToDomain(model: NFTModel): NFT {
  return {
    id: model.id,
    fileId: model.file_id,
    name: model.name,
    description: model.description,
    price: model.price,
    createdAt: model.created_at,
    updatedAt: model.updated_at
  }
}
