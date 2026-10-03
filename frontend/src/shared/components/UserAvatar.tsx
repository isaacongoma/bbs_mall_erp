import type { ComponentProps } from 'react'
import { Avatar } from '@/design-system'
import { useUsers } from '../hooks/useUsers'

export interface UserAvatarProps extends Omit<ComponentProps<typeof Avatar>, 'label' | 'image'> {
  user?: string | null
}

export function UserAvatar({ user, ...rest }: UserAvatarProps) {
  const { getUser } = useUsers()
  const details = getUser(user)
  return <Avatar label={details.full_name} image={details.user_image ?? undefined} {...rest} />
}
