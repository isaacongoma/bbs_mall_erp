import { useState } from 'react'
import { rpc } from '@/core/api/rpc'
import { toErrorMessage } from '@/core/api/errors'
import { __ } from '@/core/i18n'
import { toast } from '@/design-system'
import { sendBroadcast } from '@/shared/hooks/useBroadcast'
import { EmailTemplateForm } from './EmailTemplateForm'
import { validateTemplate } from './emailTemplateValidation'

type AnyRecord = Record<string, any>

export interface EditEmailTemplateProps {
  templateData: AnyRecord
  templates: AnyRecord
  onBack: () => void
}

export function EditEmailTemplate({ templateData, templates, onBack }: EditEmailTemplateProps) {
  const [template, setTemplate] = useState<AnyRecord>(() => ({
    ...templateData,
    content_type: templateData.use_html ? 'HTML' : 'Rich Text',
  }))
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const dirty =
    template.name !== templateData.name ||
    template.reference_doctype !== templateData.reference_doctype ||
    template.subject !== templateData.subject ||
    template.response_html !== templateData.response_html ||
    template.response !== templateData.response ||
    (template.content_type === 'HTML') !== Boolean(templateData.use_html) ||
    Boolean(template.enabled) !== Boolean(templateData.enabled)

  async function update() {
    const message = validateTemplate(template)
    setErrorMessage(message)
    if (message || !dirty) return

    const { content_type, name, ...values } = template
    const payload = { ...values, name, use_html: content_type === 'HTML' }
    setSaving(true)
    try {
      await rpc({
        url: 'frappe.client.set_value',
        params: { doctype: 'Email Template', name: templateData.name, fieldname: payload },
      })
      if (name !== templateData.name) toast.success(__('Template renamed successfully'))
      toast.success(__('Template updated successfully'))
      void templates.reload()
      sendBroadcast('refresh-email-templates')
      onBack()
    } catch (failure) {
      setSaving(false)
      setErrorMessage(toErrorMessage(failure) || __('Failed to update template'))
    }
  }

  return (
    <EmailTemplateForm
      title={__(templateData.name)}
      template={template}
      onChange={(patch) => setTemplate((current) => ({ ...current, ...patch }))}
      onBack={onBack}
      saveLabel={__('Save')}
      saveDisabled={!dirty}
      saving={saving}
      onSave={() => void update()}
      errorMessage={errorMessage}
      subjectPlaceholder={__('Payment reminder from Frappé - (#{{ name }})')}
    />
  )
}
