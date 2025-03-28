"use client"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"

interface ProfileAvatarProps {
  avatarUrl: string
}

export function ProfileAvatar({ avatarUrl }: ProfileAvatarProps) {
  return (
    <div className="space-y-2">
      <Avatar className="size-16 relative overflow-hidden">
        <AvatarImage
          src={avatarUrl}
          alt="プロフィール画像"
          className="object-cover"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        <AvatarFallback>
          <User className="size-8" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
}
