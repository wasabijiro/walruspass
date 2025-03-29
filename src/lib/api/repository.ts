import { Result } from 'neverthrow'
import { ApiError } from './error'
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

// Repository interface
export interface DbRepository {
  findProfileById(request: GetProfileByIdRequest): Promise<Result<GetProfileByIdResponse, ApiError>>
  updateProfile(request: UpdateProfileRequest): Promise<Result<UpdateProfileResponse, ApiError>>
  createVault(request: CreateVaultRequest): Promise<Result<CreateVaultResponse, ApiError>>
  listFiles(request: ListFilesRequest): Promise<Result<ListFilesResponse, ApiError>>
  createFile(request: CreateFileRequest): Promise<Result<CreateFileResponse, ApiError>>
  createNFT(request: CreateNFTRequest): Promise<Result<CreateNFTResponse, ApiError>>
}
