import { Avatar, Tooltip, cn } from '@/design-system'

export interface AvatarItem {
  name: string
  image?: string | null
  label?: string
}

export interface MultipleAvatarProps {
  avatars?: AvatarItem[]
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  labelClass?: string
  onClick?: (event: React.MouseEvent) => void
}

export function MultipleAvatar({ avatars = [], size = 'md', labelClass, onClick }: MultipleAvatarProps) {
  if (!avatars.length) return null
  const first = avatars[0] as AvatarItem
  const single = avatars.length === 1

  return (
    <div
      onClick={onClick}
      className={cn(
        'mr-1.5 flex cursor-pointer items-center',
        single ? 'truncate [&>div]:truncate' : 'flex-row-reverse',
      )}
    >
      {single ? (
        <Tooltip text={first.name}>
          <div className="flex items-center gap-2 text-base">
            <Avatar shape="circle" image={first.image ?? undefined} label={first.label} size={size} />
            <div className={cn('truncate', labelClass)}>{first.label}</div>
          </div>
        </Tooltip>
      ) : (
        [...avatars].reverse().map((avatar) => (
          <Tooltip key={avatar.name} text={avatar.name}>
            <Avatar
              className="user-avatar -mr-1.5 transform ring-2 ring-outline-base transition hover:z-10 hover:scale-110"
              shape="circle"
              image={avatar.image ?? undefined}
              label={avatar.label}
              size={size}
              data-name={avatar.name}
            />
          </Tooltip>
        ))
      )}
    </div>
  )
}
