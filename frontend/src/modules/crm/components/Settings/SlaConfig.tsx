import { useState } from 'react'
import { useListResource } from '@/core/resources'
import { SlaPolicyList } from './SlaPolicyList'
import { SlaPolicyView } from './SlaPolicyView'

type AnyRecord = Record<string, any>

interface Step {
  screen: 'list' | 'view'
  data: AnyRecord | null
  fetchData: boolean
}

export function SlaConfig() {
  const [search, setSearch] = useState('')
  const [step, setStep] = useState<Step>({ screen: 'list', data: null, fetchData: false })

  const list = useListResource({
    doctype: 'CRM Service Level Agreement',
    fields: ['name', 'default', 'enabled', 'apply_on'],
    cache: ['SLAPolicyList'],
    orderBy: 'modified desc',
    start: 0,
    pageLength: 999,
    auto: true,
  })

  if (step.screen === 'view') {
    return (
      <SlaPolicyView
        key={step.data?.name ?? 'new'}
        policy={step.data}
        fetchData={step.fetchData}
        list={list}
        onOpen={(data, fetchData = false) => setStep({ screen: 'view', data, fetchData })}
        onBack={() => setStep({ screen: 'list', data: null, fetchData: true })}
      />
    )
  }
  return (
    <SlaPolicyList
      list={list}
      search={search}
      onSearch={setSearch}
      onOpen={(data, fetchData = false) => setStep({ screen: 'view', data, fetchData })}
    />
  )
}
