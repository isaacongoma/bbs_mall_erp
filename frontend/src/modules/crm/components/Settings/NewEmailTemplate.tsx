import { useState } from 'react'
import { __ } from '@/core/i18n'
import { toast } from '@/design-system'
import { sendBroadcast } from '@/shared/hooks/useBroadcast'
import { EmailTemplateForm } from './EmailTemplateForm'
import { validateTemplate } from './emailTemplateValidation'

type AnyRecord = Record<string, any>

export interface NewEmailTemplateProps {
  templateData: AnyRecord | null
  templates: AnyRecord
  onBack: () => void
}

function initialTemplate(data: AnyRecord | null): AnyRecord {
  const base = {
    name: '',
    reference_doctype: 'CRM Deal',
    subject: '',
    content_type: 'Rich Text',
    response_html: '',
    response: '',
    enabled: false,
  }
  if (!data) return base
  const merged = { ...base, ...data }
  if (data.name) {
    merged.name = `${data.name} - Copy`
    merged.enabled = false
  }
  return merged
}

export function NewEmailTemplate({ templateData, templates, onBack }: NewEmailTemplateProps) {
  const [template, setTemplate] = useState<AnyRecord>(() => initialTemplate(templateData))
  const [errorMessage, setErrorMessage] = useState('')
  const duplicating = Boolean(templateData?.name)

  function create() {
    const message = validateTemplate(template)
    setErrorMessage(message)
    if (message) return
    const { content_type, ...values } = template
    templates.insert.submit(
      { ...values, use_html: content_type === 'HTML' },
      {
        onSuccess: () => {
          onBack()
          toast.success(__('Template created successfully'))
          sendBroadcast('refresh-email-templates')
        },
        onError: (error: AnyRecord) => setErrorMessage(error.messages?.[0] || __('Failed to create template')),
      },
    )
  }

  return (
    <EmailTemplateForm
      title={duplicating ? __('Duplicate Template') : __('New Template')}
      template={template}
      onChange={(patch) => setTemplate((current) => ({ ...current, ...patch }))}
      onBack={onBack}
      saveLabel={duplicating ? __('Duplicate') : __('Save')}
      saveIcon={duplicating ? 'lucide-copy' : undefined}
      onSave={create}
      errorMessage={errorMessage}
      subjectPlaceholder={__('Payment Reminder from Frappé - (#{{ name }})')}
    />
  )
}
