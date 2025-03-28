import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { SupabaseRepository } from '@/lib/api/adapters'
import { ListFilesRequest } from '@/lib/api/types'

/**
 * Get list of Tusky files
 * @route GET /api/tusky/files
 * @auth Not Required
 * @param {string} vaultId - Query parameter for the vault UUID
 *   - Format: /api/tusky/files?vaultId=xxx
 *   - Required: No
 * @param {string} wallet_address - Query parameter for the wallet address
 *   - Format: /api/tusky/files?wallet_address=xxx
 *   - Required: No
 * @param {string} limit - Maximum number of files to return
 *   - Format: /api/tusky/files?limit=xxx
 *   - Required: No, defaults to 100
 * @param {number} offset - Offset for pagination
 *   - Format: /api/tusky/files?offset=xxx
 *   - Required: No, defaults to 0
 * @returns {Object} List of files or error
 *   - items {Array} List of files
 *   - count {number} Total count of files matching query
 * @error
 *   - 400: Bad Request - Invalid parameters
 *   - 500: Internal Server Error - Database errors
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vaultId = searchParams.get('vaultId')
    const walletAddress = searchParams.get('wallet_address')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    
    const limit = limitParam ? parseInt(limitParam, 10) : 100
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0
    
    // Validate limit and offset
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      logger.warn('Invalid limit parameter', { limit: limitParam })
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 1000' },
        { status: 400 }
      )
    }
    
    if (isNaN(offset) || offset < 0) {
      logger.warn('Invalid offset parameter', { offset: offsetParam })
      return NextResponse.json(
        { error: 'Offset must be a non-negative number' },
        { status: 400 }
      )
    }

    logger.info('Processing files list request', { vaultId, walletAddress, limit, offset })
    
    // Create repository instance
    const repository = new SupabaseRepository(supabase)
    
    // Create request object
    const filesRequest: ListFilesRequest = {
      vaultId: vaultId || undefined,
      wallet_address: walletAddress || undefined,
      limit,
      offset
    }
    
    // List files
    const result = await repository.listFiles(filesRequest)
    
    return result.match(
      (response) => {
        logger.info('Files listed successfully', { 
          count: response.items.length, 
          total: response.count
        })
        return NextResponse.json(response)
      },
      (error) => {
        logger.error('Files listing failed', { error })
        return NextResponse.json(
          { error: error.message },
          { status: error.code }
        )
      }
    )
  } catch (error) {
    logger.error('Unexpected error in file listing', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
