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
} from './types'
import { profileModelToDomain } from './domain'
import { uploadAvatar } from './storage'

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

      return ok(profileModelToDomain(data) as GetProfileByIdResponse)
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

      const profile = profileModelToDomain(data)
      return ok({
        success: true,
        profile
      } as UpdateProfileResponse)
    } catch (error) {
      logger.error('Failed to update profile', { error })
      return err(createApiError(
        'unknown',
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      ))
    }
  }
}
