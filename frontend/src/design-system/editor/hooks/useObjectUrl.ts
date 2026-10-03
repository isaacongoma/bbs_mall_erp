import { useCallback, useEffect, useRef, useState } from 'react'

export function useObjectUrl(file: File | null): string {
  const [state, setState] = useState<{ file: File | null; url: string }>({ file: null, url: '' })

  if (state.file !== file) {
    setState({ file, url: file ? URL.createObjectURL(file) : '' })
  }

  const urlRef = useRef(state.url)
  useEffect(() => {
    const previous = urlRef.current
    urlRef.current = state.url
    if (previous && previous !== state.url) URL.revokeObjectURL(previous)
  }, [state.url])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  return state.url
}

export function useObjectUrlMap() {
  const urlsRef = useRef(new Map<string, string>())

  const urlFor = useCallback((key: string, file: File): string => {
    const existing = urlsRef.current.get(key)
    if (existing) return existing
    const url = URL.createObjectURL(file)
    urlsRef.current.set(key, url)
    return url
  }, [])

  const revokeAll = useCallback(() => {
    for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
    urlsRef.current.clear()
  }, [])

  useEffect(() => revokeAll, [revokeAll])

  return { urlFor, revokeAll }
}
