import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { SupabaseRepository } from '@/lib/api/adapters'
import { CreateFileRequest } from '@/lib/api/types'

/**
 * Upload file metadata to database
 * @route POST /api/tusky/files/upload
 * @auth Not Required
 * @param request - Request body containing file and vault information
 * @body {Object}
 *   - file_id {string} The file ID in Tusky (used only for display, not stored in DB) - Required
 *   - upload_id {string} The upload ID from Tusky - Required
 *   - blob_id {string} The blob ID from Tusky - Required
 *   - name {string} File name (used only for display, not stored in DB) - Required
 *   - mime_type {string} File MIME type - Optional
 *   - size {number} File size in bytes - Optional
 *   - vault_id {string} The vault UUID in our database - Required
 *   - wallet_address {string} The wallet address - Required
 * @returns {Object} Upload result
 *   - success {boolean} Whether the upload was successful
 *   - file {Object} The created file metadata
 * @error
 *   - 400: Bad Request - Missing required parameters
 *   - 404: Not Found - Vault not found
 *   - 500: Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body (JSON)
    const body = await request.json()
    const { 
      file_id, 
      upload_id,
      blob_id,
      name, 
      vault_id, 
      wallet_address 
    } = body
    
    // Validate required parameters
    if (!file_id) {
      logger.warn('Missing file_id in request')
      return NextResponse.json(
        { error: 'file_id is required' },
        { status: 400 }
      )
    }
    
    if (!upload_id) {
      logger.warn('Missing upload_id in request')
      return NextResponse.json(
        { error: 'upload_id is required' },
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
    
    if (!vault_id) {
      logger.warn('Missing vault_id in request')
      return NextResponse.json(
        { error: 'vault_id is required' },
        { status: 400 }
      )
    }
    
    if (!wallet_address) {
      logger.warn('Missing wallet_address in request')
      return NextResponse.json(
        { error: 'wallet_address is required' },
        { status: 400 }
      )
    }
    
    if (!blob_id) {
      logger.warn('Missing blob_id in request')
      return NextResponse.json(
        { error: 'blob_id is required' },
        { status: 400 }
      )
    }
    
    logger.info('Processing file metadata storage', { 
      file_id,
      name, 
      vault_id,
      wallet_address 
    })
    
    // Create repository instance
    const repository = new SupabaseRepository(supabase)
    
    // Create file request object
    const fileRequest: CreateFileRequest = {
      file_id,
      upload_id,
      blob_id,
      name,
      vault_id,
      wallet_address
    }
    
    // Create file metadata
    const result = await repository.createFile(fileRequest)
    
    return result.match(
      (response) => {
        logger.info('File metadata saved successfully', { 
          id: response.file.id, 
          file_id, 
          vault_id 
        })
        return NextResponse.json(response)
      },
      (error) => {
        logger.error('File metadata storage failed', { error })
        return NextResponse.json(
          { error: error.message },
          { status: error.code }
        )
      }
    )
  } catch (error) {
    logger.error('Unexpected error in file metadata storage', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
