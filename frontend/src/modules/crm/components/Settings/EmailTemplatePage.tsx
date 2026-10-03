import { useState } from 'react'
import { useListResource } from '@/core/resources'
import { useBroadcast } from '@/shared/hooks/useBroadcast'
import { EditEmailTemplate } from './EditEmailTemplate'
import { EmailTemplates } from './EmailTemplates'
import { NewEmailTemplate } from './NewEmailTemplate'

type AnyRecord = Record<string, any>
type Step = 'template-list' | 'new-template' | 'edit-template'

export function EmailTemplatePage() {
  const [step, setStep] = useState<Step>('template-list')
  const [template, setTemplate] = useState<AnyRecord | null>(null)

  const templates = useListResource({
    doctype: 'Email Template',
    cache: ['emailTemplates'],
    fields: [
      'name',
      'enabled',
      'use_html',
      'reference_doctype',
      'subject',
      'response',
      'response_html',
      'modified',
      'owner',
    ],
    orderBy: 'modified desc',
    pageLength: 20,
    auto: true,
  })

  useBroadcast('email_template_page', (data: AnyRecord) => {
    setStep(data.page)
    setTemplate(data)
  })

  function go(next: Step, data: AnyRecord | null = null) {
    setStep(next)
    setTemplate(data)
  }

  if (step === 'new-template') {
    return <NewEmailTemplate templateData={template} templates={templates} onBack={() => go('template-list')} />
  }
  if (step === 'edit-template' && template) {
    return <EditEmailTemplate templateData={template} templates={templates} onBack={() => go('template-list')} />
  }
  return (
    <EmailTemplates
      templates={templates}
      onNew={(data) => go('new-template', data ?? null)}
      onEdit={(data) => go('edit-template', data)}
    />
  )
}
