import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import { SupabaseRepository } from '@/lib/api/adapters'
import { CreateVaultRequest } from '@/lib/api/types'

/**
 * Create a new vault record in database
 * @route POST /api/tusky/vaults/create
 * @auth Not Required
 * @param request - Request with vault creation data
 * @body {Object}
 *   - name {string} Name of the vault - Required
 *   - vault_id {string} ID of the vault in Tusky - Required
 *   - wallet_address {string} Wallet address of the vault owner - Required
 *   - encrypted {boolean} Whether the vault is encrypted - Optional, defaults to true
 * @returns {Object} Created vault information
 *   - id {string} The vault UUID in our database
 *   - vault_id {string} The vault ID in Tusky
 *   - name {string} Name of the vault
 * @error
 *   - 400: Bad Request - Missing required parameters or invalid data
 *   - 500: Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { name, vault_id, wallet_address, encrypted = true } = body
    
    // Validate required parameters
    if (!name || typeof name !== 'string') {
      logger.warn('Missing or invalid name in request')
      return NextResponse.json(
        { error: 'Valid vault name is required' },
        { status: 400 }
      )
    }
    
    if (!vault_id || typeof vault_id !== 'string') {
      logger.warn('Missing or invalid vault_id in request')
      return NextResponse.json(
        { error: 'Valid vault_id is required' },
        { status: 400 }
      )
    }
    
    if (!wallet_address || typeof wallet_address !== 'string') {
      logger.warn('Missing or invalid wallet_address in request')
      return NextResponse.json(
        { error: 'Valid wallet_address is required' },
        { status: 400 }
      )
    }
    
    logger.info('Processing vault creation request', { name, wallet_address, encrypted })
    
    // Create repository instance
    const repository = new SupabaseRepository(supabase)
    
    // Create vault
    const vaultRequest: CreateVaultRequest = {
      name,
      vault_id,
      wallet_address,
      encrypted
    }
    
    const result = await repository.createVault(vaultRequest)
    
    return result.match(
      (response) => {
        logger.info('Vault created successfully', { 
          id: response.vault.id,
          success: response.success
        })
        return NextResponse.json(response)
      },
      (error) => {
        logger.error('Vault creation failed', { error })
        return NextResponse.json(
          { error: error.message },
          { status: error.code }
        )
      }
    )
  } catch (error) {
    logger.error('Unexpected error in vault creation', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
