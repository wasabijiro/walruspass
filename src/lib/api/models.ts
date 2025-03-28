export interface ProfileModel {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface TuskyVaultModel {
  id: string
  name: string
  wallet_address: string
  encrypted: boolean
}

export interface TuskyFileModel {
  id: string
  vault_id: string
  file_id: string
  upload_id: string
}
