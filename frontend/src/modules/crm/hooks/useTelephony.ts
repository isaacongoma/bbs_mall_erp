import { useEffect, useMemo } from 'react'
import { ensureIntegrationsLoaded, useIntegrationsStore } from '../stores/integrationsStore'

export function useTelephony() {
  useEffect(() => {
    ensureIntegrationsLoaded()
  }, [])

  const integrations = useIntegrationsStore((state) => state.integrations)
  const all = useMemo(() => Object.entries(integrations).map(([name, enabled]) => ({ name, enabled })), [integrations])

  return {
    integrations: all,
    isEnabled: (name: string) => Boolean(integrations[name]),
    isAnyEnabled: Object.values(integrations).some(Boolean),
  }
}
