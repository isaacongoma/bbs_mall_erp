import { Avatar } from '@/design-system'

export function AvatarPrefix({ image, label, show }: { image?: string | null; label?: string; show: boolean }) {
  if (!show) return null
  return (
    <div>
      <Avatar className="flex items-center" image={image ?? undefined} label={label} size="sm" />
    </div>
  )
}
