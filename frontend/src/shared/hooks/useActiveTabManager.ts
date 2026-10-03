import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { debounce } from '@/design-system/utils/debounce'

export interface TabDefinition {
  name: string
  [key: string]: any
}

function readStored(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function useActiveTabManager(tabs: TabDefinition[] | null | undefined, storageKey: string) {
  const location = useLocation()
  const navigate = useNavigate()
  const hash = location.hash

  const findTabIndex = useCallback(
    (tabName: string) => tabs?.findIndex((tab) => tab.name.toLowerCase() === tabName) ?? -1,
    [tabs],
  )

  const preserveLastVisitedTab = useMemo(
    () =>
      debounce((tabName: string) => {
        try {
          localStorage.setItem(storageKey, tabName.toLowerCase())
        } catch {
          return
        }
      }, 300),
    [storageKey],
  )

  const resolveInitial = useCallback((): number => {
    const fromUrl = hash.replace('#', '')
    if (fromUrl) {
      const index = findTabIndex(fromUrl)
      return index !== -1 ? index : 0
    }
    const last = readStored(storageKey, 'activity')
    if (last) {
      const index = findTabIndex(last)
      return index !== -1 ? index : 0
    }
    return 0
  }, [hash, findTabIndex, storageKey])

  const [tabIndex, setTabIndexState] = useState(resolveInitial)
  const [previousHash, setPreviousHash] = useState(hash)
  const [previousTabs, setPreviousTabs] = useState(tabs)
  const pendingNavigation = useRef<string | null>(null)

  if (previousTabs !== tabs) {
    setPreviousTabs(tabs)
    setTabIndexState(resolveInitial())
  }

  if (previousHash !== hash) {
    setPreviousHash(hash)
    if (hash) {
      const index = findTabIndex(hash.replace('#', ''))
      setTabIndexState(index === -1 ? 0 : index)
    }
  }

  useEffect(() => {
    const current = tabs?.[tabIndex]?.name
    if (!current) return
    const target = `#${current.toLowerCase()}`
    preserveLastVisitedTab(current)
    if (hash !== target && pendingNavigation.current !== target) {
      pendingNavigation.current = target
      navigate({ ...location, hash: target })
    } else if (hash === target) {
      pendingNavigation.current = null
    }
  }, [tabIndex, tabs, hash, location, navigate, preserveLastVisitedTab])

  const setTabIndex = useCallback((index: number) => setTabIndexState(index), [])

  const changeTabTo = useCallback(
    (tabName: string) => {
      const index = findTabIndex(tabName)
      if (index === -1) return
      setTabIndexState(index)
    },
    [findTabIndex],
  )

  return { tabIndex, setTabIndex, changeTabTo }
}
