import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { SupabaseRepository } from '@/lib/api/adapters'
import { CreateNFTRequest } from '@/lib/api/types'

/**
 * Create a new NFT record in database
 * @route POST /api/nft/insert
 * @auth Not Required
 * @param request - Request with NFT creation data
 * @body {Object}
 *   - nft_id {string} The NFT UUID - Required
 *   - file_id {string} The file UUID in our database - Required
 *   - name {string} The NFT name - Required
 *   - description {string} The NFT description - Required
 *   - price {string} The NFT price - Required
 * @returns {Object} Created NFT information
 *   - success {boolean} Whether the creation was successful
 *   - nft {Object} The created NFT data
 * @error
 *   - 400: Bad Request - Missing required parameters
 *   - 404: Not Found - File not found
 *   - 500: Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { nft_id, file_id, name, description, price } = body
    
    // Validate required parameters
    if (!nft_id) {
      logger.warn('Missing nft_id in request')
      return NextResponse.json(
        { error: 'nft_id is required' },
        { status: 400 }
      )
    }
    
    if (!file_id) {
      logger.warn('Missing file_id in request')
      return NextResponse.json(
        { error: 'file_id is required' },
        { status: 400 }
      )
    }
    
    if (!name) {
      logger.warn('Missing name in request')
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }
    
    if (!description) {
      logger.warn('Missing description in request')
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 }
      )
    }
    
    if (!price) {
      logger.warn('Missing price in request')
      return NextResponse.json(
        { error: 'price is required' },
        { status: 400 }
      )
    }
    
    logger.info('Processing NFT creation request', { nft_id, file_id, name })
    
    // Create repository instance
    const repository = new SupabaseRepository(supabase)
    
    // Create NFT request object
    const nftRequest: CreateNFTRequest = {
      nft_id,
      file_id,
      name,
      description,
      price
    }
    
    // Create NFT metadata
    const result = await repository.createNFT(nftRequest)
    
    return result.match(
      (response) => {
        logger.info('NFT metadata saved successfully', { 
          id: response.nft.id, 
          file_id 
        })
        return NextResponse.json(response)
      },
      (error) => {
        logger.error('NFT metadata storage failed', { error })
        return NextResponse.json(
          { error: error.message },
          { status: error.code }
        )
      }
    )
  } catch (error) {
    logger.error('Unexpected error in NFT creation', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
