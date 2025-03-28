import { Profile } from "./domain"

// `GET /api/profile`
export interface GetProfileByIdRequest {
  userId: string
}
export type GetProfileByIdResponse = Profile

// `PUT /api/profile/update`
export interface UpdateProfileRequest {
  display_name?: string | null
  avatar_file?: File | null
}
export interface UpdateProfileResponse {
  success: boolean
  profile: Profile
}
