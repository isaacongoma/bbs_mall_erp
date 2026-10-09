import { useEffect, useState } from 'react'
import { slugSegment } from '@/core/navigation/canonicalPath'
import { loadDeskBoot } from './boot'

let slugMap: Map<string, string> | null = null

function namesBySlug(names: string[]): Map<string, string> {
  if (!slugMap || slugMap.size !== names.length) {
    slugMap = new Map(names.map((name) => [slugSegment(name), name]))
  }
  return slugMap
}

export function useDoctypeSegment(raw: string | undefined): string {
  const segment = decodeURIComponent(raw ?? '')
  const direct = segment !== slugSegment(segment)
  const [resolved, setResolved] = useState<{ segment: string; name: string } | null>(null)

  useEffect(() => {
    if (direct || !segment) return undefined
    let live = true
    void loadDeskBoot().then((boot) => {
      if (!live) return
      const names = (boot.doctype_names as string[] | undefined) ?? []
      setResolved({ segment, name: namesBySlug(names).get(segment) ?? segment })
    })
    return () => {
      live = false
    }
  }, [direct, segment])

  if (direct || !segment) return segment
  return resolved?.segment === segment ? resolved.name : ''
}
