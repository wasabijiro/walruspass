import { ProfileModel } from "./models"

export type ProfileId = string

export interface Profile {
  id: ProfileId
  displayName: string | null
  avatarUrl: string | null
}

export function profileModelToDomain(model: ProfileModel): Profile {
  return {
    id: model.id,
    displayName: model.display_name,
    avatarUrl: model.avatar_url
  }
}
