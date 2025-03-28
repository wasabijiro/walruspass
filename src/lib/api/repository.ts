import { Result } from 'neverthrow'
import { ApiError } from './error'
import { GetProfileByIdRequest, GetProfileByIdResponse, UpdateProfileRequest, UpdateProfileResponse } from './types'

// Repository interface
export interface DbRepository {
  findProfileById(request: GetProfileByIdRequest): Promise<Result<GetProfileByIdResponse, ApiError>>
  updateProfile(request: UpdateProfileRequest): Promise<Result<UpdateProfileResponse, ApiError>>
}
