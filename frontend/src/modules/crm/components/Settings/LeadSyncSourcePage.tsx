import { useState } from 'react'
import { useListResource } from '@/core/resources'
import { LeadSyncSourceForm } from './LeadSyncSourceForm'
import { LeadSyncSources } from './LeadSyncSources'

type AnyRecord = Record<string, any>
type Step = 'source-list' | 'new-source' | 'edit-source'

export function LeadSyncSourcePage() {
  const [step, setStep] = useState<Step>('source-list')
  const [source, setSource] = useState<AnyRecord | null>(null)

  const sources = useListResource({
    doctype: 'Lead Sync Source',
    cache: ['lead_sync_sources'],
    fields: ['name', 'enabled', 'type', 'last_synced_at', 'facebook_lead_form'],
    auto: true,
    orderBy: 'modified desc',
    pageLength: 20,
  })

  function go(next: Step, data: AnyRecord | null = null) {
    setStep(next)
    setSource(next === 'new-source' && data ? { ...data, __duplicate: true } : data)
  }

  return (
    <div className="flex-1 p-6">
      {step === 'source-list' ? (
        <LeadSyncSources sources={sources} onStep={(next, data) => go(next, data ?? null)} />
      ) : (
        <LeadSyncSourceForm
          key={`${step}-${source?.name ?? 'new'}`}
          sourceData={source}
          sources={sources}
          onBack={() => go('source-list')}
        />
      )}
    </div>
  )
}
