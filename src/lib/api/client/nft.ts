import { NFT } from '@/lib/api/domain'
import { logger } from '@/lib/logger'

export const nftApi = {
  /**
   * Create a new NFT record in database
   * @param nft_id - The NFT UUID
   * @param file_id - The file UUID in our database
   * @returns Created NFT information
   */
  async create(nft_id: string, file_id: string): Promise<NFT> {
    try {
      const response = await fetch('/api/nft/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nft_id,
          file_id
        })
      })

      const data = await response.json()
      if (!response.ok) {
        logger.error('Failed to create NFT', { error: data.error })
        throw new Error(data.error)
      }
      return data.nft
    } catch (error) {
      logger.error('Error creating NFT', { error })
      throw error
    }
  }
}
