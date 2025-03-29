import { SupabaseClient } from '@supabase/supabase-js'
import { Result, ok, err } from 'neverthrow'
import { DbRepository } from './repository'
import { ApiError, createApiError } from './error'
import { logger } from '@/lib/logger'
import { authenticateUser } from './middleware'
import {
  GetProfileByIdRequest,
  GetProfileByIdResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  CreateVaultRequest,
  CreateVaultResponse,
  ListFilesRequest,
  ListFilesResponse,
  CreateFileRequest,
  CreateFileResponse,
  CreateNFTRequest,
  CreateNFTResponse
} from './types'
import { 
  profileModelToDomain, 
  tuskyVaultModelToDomain, 
  tuskyFileModelToDomain 
} from './domain'
import { uploadAvatar } from './storage'
import { ProfileModel, TuskyFileModel, TuskyVaultModel } from './models'

export class SupabaseRepository implements DbRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findProfileById(request: GetProfileByIdRequest): Promise<Result<GetProfileByIdResponse, ApiError>> {
    try {
      logger.info('Fetching profile', { id: request.userId })
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', request.userId)
        .single()

      if (error) {
        return err(createApiError(
          'database',
          error.message,
          error
        ))
      }

      if (!data) {
        return err(createApiError(
          'not_found',
          `Profile with id ${request.userId} not found`
        ))
      }

      return ok(profileModelToDomain(data as ProfileModel))
    } catch (error) {
      logger.error('Failed to fetch profile', { id: request.userId, error })
      return err(createApiError(
        'unknown',
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      ))
    }
  }

  async updateProfile(request: UpdateProfileRequest): Promise<Result<UpdateProfileResponse, ApiError>> {
    try {
      // Authenticate user
      const authResult = await authenticateUser(this.client)
      if (authResult.isErr()) {
        return err(authResult.error)
      }
      const { user } = authResult.value

      logger.info('Updating profile', { userId: user.id })

      // Prepare update data
      const updateData: {
        display_name?: string | null
        avatar_url?: string | null
        updated_at: string
      } = {
        updated_at: new Date().toISOString()
      }

      // Set display_name if provided
      if ('display_name' in request) {
        updateData.display_name = request.display_name
      }

      // Handle avatar upload if file exists
      if (request.avatar_file) {
        const uploadResult = await uploadAvatar(this.client, {
          file: request.avatar_file,
          userId: user.id
        })

        if (uploadResult.isErr()) {
          return err(uploadResult.error)
        }

        updateData.avatar_url = uploadResult.value
      }

      // Update profile with new data
      const { data, error } = await this.client
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return err(createApiError(
          'database',
          error.message,
          error
        ))
      }

      if (!data) {
        return err(createApiError(
          'not_found',
          `Profile with id ${user.id} not found`
        ))
      }

      const profile = profileModelToDomain(data as ProfileModel)
      return ok({
        success: true,
        profile
      })
    } catch (error) {
      logger.error('Failed to update profile', { error })
      return err(createApiError(
        'unknown',
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      ))
    }
  }

  /**
   * Create a vault record in Supabase
   * @param request Vault creation parameters
   * @returns Result with created vault or error
   */
  async createVault(request: CreateVaultRequest): Promise<Result<CreateVaultResponse, ApiError>> {
    try {
      const { name, vault_id, wallet_address, encrypted = true } = request
      
      logger.info('Creating vault record in database', { name, vault_id, wallet_address })
      
      // Check if vault already exists
      const { data: existingVault, error: checkError } = await this.client
        .from('tusky_vaults')
        .select('id')
        .eq('id', vault_id)
        .eq('wallet_address', wallet_address)
        .maybeSingle()
      
      if (checkError) {
        logger.error('Error checking for existing vault', { error: checkError })
        return err(createApiError('database', 'Failed to check for existing vault', checkError))
      }
      
      // If vault already exists, return it
      if (existingVault) {
        logger.info('Vault already exists', { id: existingVault.id, vault_id, wallet_address })
        
        // Get full vault data
        const { data: vaultData, error: getError } = await this.client
          .from('tusky_vaults')
          .select('*')
          .eq('id', existingVault.id)
          .single()
        
        if (getError) {
          logger.error('Error retrieving existing vault', { error: getError })
          return err(createApiError('database', 'Failed to retrieve existing vault', getError))
        }
        
        const vault = tuskyVaultModelToDomain(vaultData as TuskyVaultModel)
        
        return ok({
          success: true,
          vault
        })
      }
      
      // Save vault metadata to database
      const { data: vaultData, error: vaultError } = await this.client
        .from('tusky_vaults')
        .insert({
          id: vault_id,
          name,
          wallet_address,
          encrypted
        })
        .select()
        .single()
      
      if (vaultError) {
        logger.error('Error saving vault metadata', { error: vaultError })
        return err(createApiError('database', 'Failed to save vault metadata', vaultError))
      }
      
      logger.info('Vault metadata saved successfully', { 
        id: vaultData.id, 
        vault_id, 
        wallet_address 
      })
      
      const vault = tuskyVaultModelToDomain(vaultData as TuskyVaultModel)
      
      return ok({
        success: true,
        vault
      })
    } catch (error) {
      logger.error('Unexpected error in vault creation', { error })
      return err(createApiError('unknown', 'An unexpected error occurred while creating vault', error))
    }
  }

  /**
   * List files from Supabase matching the specified criteria
   * @param request File listing parameters
   * @returns Result with list of files or error
   */
  async listFiles(request: ListFilesRequest): Promise<Result<ListFilesResponse, ApiError>> {
    try {
      const { vaultId, wallet_address, limit = 100, offset = 0 } = request
      
      logger.info('Fetching Tusky files from database', { vaultId, wallet_address, limit, offset })
      
      // Start by fetching vaults
      let vaultsQuery = this.client
        .from('tusky_vaults')
        .select('*')
      
      // Apply wallet address filter if provided
      if (wallet_address) {
        vaultsQuery = vaultsQuery.eq('wallet_address', wallet_address)
      }
      
      // Apply vault ID filter if provided
      if (vaultId) {
        vaultsQuery = vaultsQuery.eq('id', vaultId)
      }
      
      const { data: vaultsData, error: vaultsError } = await vaultsQuery
      
      if (vaultsError) {
        logger.error('Error fetching vaults', { error: vaultsError })
        return err(createApiError('database', 'Failed to fetch vaults', vaultsError))
      }
      
      const vaults = vaultsData.map(v => tuskyVaultModelToDomain(v as TuskyVaultModel))
      
      if (vaults.length === 0) {
        return ok({
          items: [],
          count: 0
        })
      }
      
      // Now fetch files using the vault IDs
      const vaultIds = vaults.map(v => v.id)
      
      // Start building the query with files and their associated NFTs
      let filesQuery = this.client
        .from('tusky_files')
        .select(`
          *,
          nfts (
            id
          )
        `, { count: 'exact' })
        .in('vault_id', vaultIds)
      
      // Apply pagination
      filesQuery = filesQuery.range(offset, offset + limit - 1)
      
      // Execute the query
      const { data: filesData, error: filesError, count } = await filesQuery
      
      if (filesError) {
        logger.error('Error fetching Tusky files', { error: filesError })
        return err(createApiError('database', 'Failed to fetch files', filesError))
      }
      
      // Map files to domain models with NFT information
      const items = filesData.map(fileModel => {
        const vault = vaults.find(v => v.id === fileModel.vault_id)!
        const file = tuskyFileModelToDomain(fileModel as TuskyFileModel, vault)
        
        return {
          ...file,
          nft: {
            id: fileModel.nfts[0].id,
            fileId: file.id,
            createdAt: fileModel.created_at,
            updatedAt: fileModel.updated_at
          }
        }
      })
      
      logger.info('Files fetched successfully', { 
        count: items.length, 
        total: count
      })
      
      return ok({
        items,
        count: count || 0
      })
    } catch (error) {
      logger.error('Unexpected error in file listing', { error })
      return err(createApiError('unknown', 'An unexpected error occurred while listing files', error))
    }
  }

  /**
   * Create a file record in Supabase
   * @param request File creation parameters
   * @returns Result with created file or error
   */
  async createFile(request: CreateFileRequest): Promise<Result<CreateFileResponse, ApiError>> {
    try {
      const { 
        upload_id, 
        blob_id,
        vault_id, 
        wallet_address 
      } = request
      
      logger.info('Creating file record in database', { 
        upload_id,
        blob_id,
        vault_id,
        wallet_address 
      })
      
      // Check if vault exists and belongs to the wallet
      const { data: vaultData, error: vaultError } = await this.client
        .from('tusky_vaults')
        .select('*')
        .eq('id', vault_id)
        .eq('wallet_address', wallet_address)
        .single()
      
      if (vaultError) {
        logger.warn('Vault not found or not owned by wallet', { vault_id, wallet_address, error: vaultError })
        return err(createApiError('not_found', 'Vault not found or not owned by wallet', vaultError))
      }
      
      const vault = tuskyVaultModelToDomain(vaultData as TuskyVaultModel)
      
      // Save file metadata to database using upload_id as the file id
      const { data: fileData, error: fileError } = await this.client
        .from('tusky_files')
        .insert({
          id: upload_id,  // upload_idをファイルのIDとして使用
          vault_id
        })
        .select()
        .single()
      
      if (fileError) {
        logger.error('Error saving file metadata', { error: fileError })
        return err(createApiError('database', 'Failed to save file metadata', fileError))
      }
      
      logger.info('File metadata saved successfully', { id: fileData.id, upload_id, vault_id })
      
      const file = tuskyFileModelToDomain(fileData as TuskyFileModel, vault)
      
      return ok({
        success: true,
        file
      })
    } catch (error) {
      logger.error('Unexpected error in file creation', { error })
      return err(createApiError('unknown', 'An unexpected error occurred while creating file', error))
    }
  }

  async createNFT(request: CreateNFTRequest): Promise<Result<CreateNFTResponse, ApiError>> {
    try {
      const { nft_id, file_id } = request

      logger.info('Creating NFT record in database', { nft_id, file_id })

      // Check if file exists
      const { error: fileError } = await this.client
        .from('tusky_files')
        .select('*')
        .eq('id', file_id)
        .single()
      
      if (fileError) {
        logger.warn('File not found', { file_id, error: fileError })
        return err(createApiError('not_found', 'File not found', fileError))
      }
      
      // Save NFT metadata to database
      const { data: nftData, error: nftError } = await this.client
        .from('nfts')
        .insert({
          id: nft_id,  // nft_idを指定
          file_id
        })
        .select()
        .single()
      
      if (nftError) {
        logger.error('Error saving NFT metadata', { error: nftError })
        return err(createApiError('database', 'Failed to save NFT metadata', nftError))
      }
      
      logger.info('NFT metadata saved successfully', { id: nftData.id, file_id })
      
      return ok({
        success: true,
        nft: {
          id: nftData.id,
          fileId: nftData.file_id,
          createdAt: nftData.created_at,
          updatedAt: nftData.updated_at
        }
      })
    } catch (error) {
      logger.error('Unexpected error in NFT creation', { error })
      return err(createApiError('unknown', 'An unexpected error occurred while creating NFT', error))
    }
  }
}
