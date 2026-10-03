import { openWebsite } from '../../utils/url'

export interface WebsiteLinkProps {
  url: string
  label?: string
  variant?: 'label' | 'icon'
}

export function WebsiteLink({ url, label = '', variant = 'label' }: WebsiteLinkProps) {
  const open = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    openWebsite(url)
  }

  if (variant === 'label') {
    return (
      <button
        type="button"
        className="w-full cursor-pointer truncate rounded bg-transparent p-0 text-left text-base hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-gray-4 focus-visible:ring-offset-1"
        onClick={open}
      >
        {label}
      </button>
    )
  }

  return (
    <span
      className="lucide-external-link h-3.5 w-3.5 shrink-0 cursor-pointer text-ink-gray-5"
      aria-hidden="true"
      onClick={open}
    />
  )
}
