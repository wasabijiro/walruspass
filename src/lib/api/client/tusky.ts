import { TuskyFile, TuskyVault } from '@/lib/api/domain'
import { logger } from '@/lib/logger'

export const tuskyApi = {
  async createVault(
    name: string,
    vault_id: string,
    wallet_address: string,
    encrypted: boolean = true
  ): Promise<TuskyVault> {
    try {
      const response = await fetch('/api/tusky/vaults/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          vault_id,
          wallet_address,
          encrypted
        })
      })

      const data = await response.json()
      if (!response.ok) {
        logger.error('Failed to create vault', { error: data.error })
        throw new Error(data.error)
      }
      return data.vault
    } catch (error) {
      logger.error('Error creating vault', { error })
      throw error
    }
  },

  async saveFile(
    file_id: string,
    upload_id: string,
    blob_id: string,
    name: string,
    vault_id: string,
    wallet_address: string,
    mime_type?: string,
    size?: number
  ): Promise<TuskyFile> {
    try {
      const response = await fetch('/api/tusky/files/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id,
          upload_id,
          blob_id,
          name,
          vault_id,
          wallet_address,
          mime_type,
          size
        })
      })

      const data = await response.json()
      if (!response.ok) {
        logger.error('Failed to save file metadata', { error: data.error })
        throw new Error(data.error)
      }
      return data.file
    } catch (error) {
      logger.error('Error saving file metadata', { error })
      throw error
    }
  },

  async getFiles(options: {
    vaultId?: string;
    wallet_address?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: TuskyFile[]; count: number }> {
    try {
      // クエリパラメータを構築
      const queryParams = new URLSearchParams()
      
      if (options.vaultId) {
        queryParams.append('vaultId', options.vaultId)
      }
      
      if (options.wallet_address) {
        queryParams.append('wallet_address', options.wallet_address)
      }
      
      if (options.limit) {
        queryParams.append('limit', options.limit.toString())
      }
      
      if (options.offset) {
        queryParams.append('offset', options.offset.toString())
      }
      
      const queryString = queryParams.toString()
      const url = `/api/tusky/files${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        logger.error('Failed to fetch files', { error: data.error })
        throw new Error(data.error)
      }
      
      return data
    } catch (error) {
      logger.error('Error fetching files', { error })
      throw error
    }
  }
}
