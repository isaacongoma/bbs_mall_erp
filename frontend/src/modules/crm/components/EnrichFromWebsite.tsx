import { useEffect, useEffectEvent, useState } from 'react'
import { toErrorMessage } from '@/core/api/errors'
import { rpc } from '@/core/api/rpc'
import { __ } from '@/core/i18n'
import { capture } from '@/core/telemetry'
import { Button, toast } from '@/design-system'
import { useGlobalStore } from '@/shared/stores/globalStore'
import { ensureOrganizationsLoaded } from '../stores/organizationsStore'

type AnyRecord = Record<string, any>

const EVENT = 'domain_enrichment_progress'

export interface EnrichFromWebsiteProps {
  doctype: string
  docname: string
  website?: string
  onDone?: () => void
}

export function EnrichFromWebsite({ doctype, docname, website = '', onDone }: EnrichFromWebsiteProps) {
  const socket = useGlobalStore((state) => state.$socket)
  const [running, setRunning] = useState(false)

  const onProgress = useEffectEvent((data: AnyRecord) => {
    if (!data || data.reference_doctype !== doctype || data.reference_name !== docname) return
    if (data.status === 'completed') {
      setRunning(false)
      void ensureOrganizationsLoaded().reload()
      const filled: string[] = data.payload?.filled_fields || []
      const notes: string[] = data.payload?.notes || []
      if (filled.length) toast.success(__('Enriched. Filled: {0}', [filled.join(', ')]))
      else if (notes.length) toast.warning(notes[0] ?? '')
      else toast.success(__('Enrichment complete.'))
      onDone?.()
    } else if (data.status === 'error') {
      setRunning(false)
      toast.error(data.message || __('Enrichment failed.'))
    }
  })

  useEffect(() => {
    if (!running) return
    const handler = (data: unknown) => onProgress(data as AnyRecord)
    socket.on(EVENT, handler)
    return () => socket.off(EVENT, handler)
  }, [running, socket])

  async function enrich() {
    if (!website.trim()) {
      toast.warning(__('Set a Website on this record before enriching.'))
      return
    }
    capture('enrichment_triggered', { doctype })
    setRunning(true)
    try {
      await rpc({
        url: 'crm.domain_enrichment.api.enrich',
        params: { reference_doctype: doctype, reference_name: docname },
      })
    } catch (error) {
      setRunning(false)
      toast.error(toErrorMessage(error) || __('Could not start enrichment.'))
    }
  }

  return (
    <Button
      label={__('Enrich')}
      loading={running}
      loadingText={__('Enriching')}
      tooltip={running ? __('Enriching…') : __('Enrich from website')}
      iconLeft="lucide-zap"
      onClick={() => void enrich()}
    />
  )
}
