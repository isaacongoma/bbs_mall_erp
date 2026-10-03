import { useEffect } from 'react'

export interface PageMeta {
  title?: string
  emoji?: string
  icon?: string
}

let favicon: HTMLLinkElement | null = null
let defaultFavicon: string | null = null

function getFavicon(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null
  if (!favicon) {
    favicon = document.querySelector('link[rel="icon"]')
    defaultFavicon = favicon?.href ?? null
  }
  return favicon
}

export function usePageMeta(meta: PageMeta | null | undefined): void {
  const title = meta?.title
  const emoji = meta?.emoji
  const icon = meta?.icon
  const active = meta != null

  useEffect(() => {
    if (!active) return
    if (title) document.title = title
    const link = getFavicon()
    if (!link) return
    if (emoji) {
      link.href = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`
    } else if (icon) {
      link.href = icon
    } else if (defaultFavicon) {
      link.href = defaultFavicon
    }
  }, [active, title, emoji, icon])
}
